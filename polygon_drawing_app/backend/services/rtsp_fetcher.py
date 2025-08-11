import threading
import cv2
import os
import datetime
import time
from config import RTMP_STREAMS, VIDEO_FPS

FRAME_INTERVAL = 1 / VIDEO_FPS

class CameraCaptureThread(threading.Thread):
    def __init__(self, camera_id, rtsp_url, latest_frames, save_dir='saved_frames'):
        super().__init__(daemon=True)
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.latest_frames = latest_frames  # shared dict from the main class
        self.save_dir = save_dir
        os.makedirs(self.save_dir, exist_ok=True)
        self._running = threading.Event()
        self._running.set()

    def stop(self):
        self._running.clear()

    def run(self):
        cap = None

        while self._running.is_set():
            if cap is None:
                cap = cv2.VideoCapture(self.rtsp_url)
                if not cap.isOpened():
                    print(f"[{self.camera_id}] Failed to open RTSP stream {self.rtsp_url}, retrying in 5s")
                    cap.release()
                    cap = None
                    time.sleep(5)
                    continue
                else:
                    print(f"[{self.camera_id}] RTSP stream opened")

            _, frame_bgr = cap.read()

            self.latest_frames[self.camera_id] = frame_bgr
        if cap:
            cap.release()
            print(f"[{self.camera_id}] VideoCapture released.")


class RTSPFrameFetcherCV:
    def __init__(self):
        self.latest_frames = {}
        self._threads = {}
    
    def start(self):
        for camera_id, rtsp_url in RTMP_STREAMS.items():
            if camera_id not in self._threads or not self._threads[camera_id].is_alive():
                thread = CameraCaptureThread(camera_id, rtsp_url, self.latest_frames)
                self._threads[camera_id] = thread
                thread.start()
                print(f"[{camera_id}] Thread started")

    def stop(self):
        for thread in self._threads.values():
            thread.stop()
        for thread in self._threads.values():
            thread.join()
        print("All camera threads stopped")

    def get_latest_frame(self, camera_id):
        frame = self.latest_frames.get(camera_id)
        return frame

    def get_all_latest_frames(self):
        # Return shallow copy of all latest frames dictionary
        # (Note: bytes objects are immutable so shallow copy is safe)
        return self.latest_frames.copy()


# Singleton instance
rtsp_fetcher = RTSPFrameFetcherCV()