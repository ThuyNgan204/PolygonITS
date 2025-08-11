import os
import json
import asyncio
import cv2
from typing import Dict

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse, Response
from services.rtsp_fetcher import rtsp_fetcher
from schemas.vehicle_data import VehicleBatchData
from fastapi import Body
from config import RTMP_STREAMS
from datetime import datetime, timedelta

router = APIRouter()
update_event = asyncio.Event()

# Stores cumulative counts that reset only once per hour
vehicle_data_cumulative_store: Dict[str, Dict[str, Dict[str, int]]] = {}

# Stores frontend-facing data to stream to clients (copied from cumulative store)
vehicle_data_store: Dict[str, Dict[str, Dict[str, int]]] = {}

# One asyncio.Queue per camera for efficient notification of updates to streaming clients
update_queues: Dict[str, asyncio.Queue] = {}

def get_update_queue(camera_id: str):
    if camera_id not in update_queues:
        update_queues[camera_id] = asyncio.Queue()
        print(f"[INFO] Initialized update queue for camera {camera_id}")
    return update_queues[camera_id]

async def reset_counts_periodically():
    """
    Background task: resets cumulative counts every hour,
    notifies frontend clients of reset event (without immediately resetting frontend view).
    """
    while True:
        now = datetime.now()
        next_hour = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
        wait_time = (next_hour - now).total_seconds()
        await asyncio.sleep(wait_time)

        print(f"[INFO] Resetting cumulative vehicle counts at {datetime.now()}")

        # Reset the internal cumulative store only, NOT the frontend store yet
        for camera_id in vehicle_data_cumulative_store.keys():
            for zone in vehicle_data_cumulative_store[camera_id].keys():
                vehicle_data_cumulative_store[camera_id][zone] = {
                    "number_of_motorbike": 0,
                    "number_of_car": 0,
                }

            # Notify frontend clients that a reset event occurred
            queue = get_update_queue(camera_id)
            await queue.put(camera_id)

        print(f"[INFO] Reset event notification sent at {datetime.now()}")

class TrackingController:
    # Class variable to track processing videos
    processing_videos: Dict[str, bool] = {}
    
    def __init__(self):
        self.router = APIRouter(redirect_slashes=False)
        
        # New endpoints for video processing
        self.router.add_api_route("/stream-data/{video_name}", self.stream_video_data, methods=["GET"])
        self.router.add_api_route("/data/{video_name}", self.get_video_data, methods=["GET"])
        # self.router.add_api_route("/live-stream-mjpeg/{video_name}", self.live_stream_mjpeg, methods=["GET"])
        # self.router.add_api_route("/video-file/{video_name}", self.get_video_file, methods=["GET"])
        self.router.add_api_route("/stream-rtsp/{serial_number}", self.stream_rtsp_camera, methods=["GET"])
        self.router.add_api_route("/latest-frame/{serial_number}", self.get_latest_frame, methods=["GET"])
        self.router.add_api_route("/vehicle-data-batch", self.post_vehicle_data_batch, methods=["POST"])
        self.router.add_api_route("/vehicle-data-stream/{camera_id}", self.stream_vehicle_data, methods=['GET'])

    @staticmethod
    async def stream_video_data(video_name: str):
        """Stream real-time data from video processing"""
        async def event_generator():
            data_file = os.path.join("backend", "data", f"{video_name}.json")
            last_frame = 0
            
            while TrackingController.processing_videos.get(video_name, False):
                try:
                    if os.path.exists(data_file):
                        with open(data_file, "r") as f:
                            data = json.load(f)
                        
                        if data and len(data) > 0:
                            latest_frame = data[-1]
                            if latest_frame.get('frame', 0) > last_frame:
                                last_frame = latest_frame.get('frame', 0)
                                
                                # Send frame update with zone data
                                frame_data = {
                                    "type": "frame_update",
                                    "frame_number": last_frame,
                                    "zone_data": latest_frame.get('evaluate', [])
                                }
                                yield f"data: {json.dumps(frame_data)}\n\n"
                    
                    await asyncio.sleep(1)  # Update every second
                    
                except Exception as e:
                    print(f"Error in stream_video_data: {e}")
                    await asyncio.sleep(1)
            
            # Send completion message
            yield f"data: {json.dumps({'type': 'processing_complete'})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    @staticmethod
    def get_video_data(video_name: str):
        """Get current video processing data"""
        data_file = os.path.join("backend", "data", f"{video_name}.json")
        try:
            if os.path.exists(data_file):
                with open(data_file, "r") as f:
                    data = json.load(f)
                # Return the latest frame data
                return data[-1] if data else {"evaluate": []}
            else:
                return {"evaluate": []}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading video data: {str(e)}")
    
    @staticmethod
    def stream_rtsp_camera(serial_number: str):
        if serial_number not in rtsp_fetcher.latest_frames and serial_number not in RTMP_STREAMS:
            raise HTTPException(status_code=404, detail="Camera not found")

        def frame_generator(camera_id):
            while True:
                frame = rtsp_fetcher.get_latest_frame(camera_id)
                if frame is None:
                    continue

                frame_bgr = frame.copy()
                # Hardcode resize to HD (1280x720)
                target_width, target_height = 1280, 720
                resized_frame = cv2.resize(frame_bgr, (target_width, target_height), interpolation=cv2.INTER_LINEAR)

                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
                success, buffer_jpeg = cv2.imencode('.jpg', resized_frame, encode_param) # defensive copy

                if not success:
                    continue 

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    buffer_jpeg.tobytes() + b"\r\n"
                )

        return StreamingResponse(
            frame_generator(camera_id=serial_number),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )

    @staticmethod
    def get_latest_frame(serial_number: str):
        if serial_number not in rtsp_fetcher.latest_frames and serial_number not in RTMP_STREAMS:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        frame = rtsp_fetcher.get_latest_frame(serial_number)

        if frame is None:
            raise HTTPException(status_code=404, detail="Frame not available yet")
        
        frame_copy = frame.copy()

        target_width, target_height = 1280, 720
        resized_frame = cv2.resize(frame_copy, (target_width, target_height), interpolation=cv2.INTER_LINEAR)

        # Encode the resized frame back to JPEG bytes
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
        success, buffer_jpeg = cv2.imencode('.jpg', resized_frame, encode_param)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to encode frame to JPEG")

        jpeg_bytes = buffer_jpeg.tobytes()

        return Response(content=jpeg_bytes, media_type="image/jpeg")
    
    @staticmethod
    async def post_vehicle_data_batch(data: VehicleBatchData = Body(...)):
        """
        Receive vehicle count batch updates from processing system,
        assign counts from payload directly to internal store,
        propagate to frontend store and notify frontend subscribers.
        """
        print(data)
        camera_id = data.camera_id
        zones = data.zones

        if camera_id not in vehicle_data_cumulative_store:
            vehicle_data_cumulative_store[camera_id] = {}
        if camera_id not in vehicle_data_store:
            vehicle_data_store[camera_id] = {}

        for zone_data in zones:
            zone = zone_data.zone

            # Directly assign counts from the incoming payload
            vehicle_data_cumulative_store[camera_id][zone] = {
                "number_of_motorbike": zone_data.number_of_motorbike,
                "number_of_car": zone_data.number_of_car,
            }

        # Update frontend-facing store by copying cumulative data (fresh snapshot)
        copy_store = {
            zone: counts.copy()
            for zone, counts in vehicle_data_cumulative_store[camera_id].items()
        }
        vehicle_data_store[camera_id] = copy_store

        # Notify frontend clients new data is ready
        queue = get_update_queue(camera_id)
        await queue.put(camera_id)

        return {"message": "Batch vehicle data received", "data": vehicle_data_store[camera_id]}
    
    @staticmethod
    async def stream_vehicle_data(camera_id: str, request: Request):
        """
        SSE endpoint streaming vehicle data updates for given camera_id.
        Sends initial data immediately and pushes new data when notified.
        """
        queue = get_update_queue(camera_id)

        async def event_generator():
            # Immediate initial send
            data = vehicle_data_store.get(camera_id, {})
            yield f"data: {json.dumps(data)}\n\n"

            while True:
                try:
                    # Wait for notification or timeout for connection keep-alive
                    await asyncio.wait_for(queue.get(), timeout=0.01)
                except asyncio.TimeoutError:
                    # Timeout triggers empty send (optional: heartbeat)
                    pass

                if await request.is_disconnected():
                    print(f"[INFO] Client disconnected from vehicle-data-stream for camera {camera_id}")
                    break

                data = vehicle_data_store.get(camera_id, {}).copy()
                yield f"data: {json.dumps(data)}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
