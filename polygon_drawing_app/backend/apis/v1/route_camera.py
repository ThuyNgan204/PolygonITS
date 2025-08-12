import base64

import cv2
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from db.models import Camera
from db.session import get_db
# ✅ Cập nhật import
from schemas.camera import CameraShow, CameraUpdatePoints

router = APIRouter()

def extract_frame_to_base64(video_path: str, frame_number: int) -> str:
    # ... (Không thay đổi) ...
    cap = cv2.VideoCapture(video_path)

    curr_frame = 0
    base64_str = None

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if curr_frame == frame_number:
            _, buffer = cv2.imencode('.jpg', frame)
            base64_str = base64.b64encode(buffer).decode("utf-8")
            break

        curr_frame += 1

    cap.release()
    return base64_str if base64_str else None


class CameraController:
    def __init__(self):
        self.router = APIRouter(redirect_slashes=False)
        self.router.add_api_route("", self.get_camera, methods=["GET"])
        self.router.add_api_route("/frame/{frame_number}", self.get_frame_camera, methods=["GET"])
        self.router.add_api_route("/{serial_number}", self.update_camera, methods=["PUT"])
        self.router.add_api_route("/{serial_number}", self.get_camera_by_serial_number, methods=["GET"])

    @staticmethod
    def get_camera(
        session: Session = Depends(get_db)
    ):
        query = text(
            """
            SELECT serial_number, name, points
            FROM camera
            ORDER BY name
            """
        )

        rows = session.execute(query).fetchall()

        results = []
        for row in rows:
            video_path = f"assets/{row.name}.mp4"

            # ✅ `points` bây giờ là một list các object, không phải list các list
            camera = CameraShow(
                serial_number=row[0],
                name=row[1],
                points=row[2],
                image=extract_frame_to_base64(video_path, 10)
            )
            results.append(camera)

        return results

    @staticmethod
    def get_frame_camera(
        frame_number: int
    ):
        # ... (Không thay đổi) ...
        """Extract a specific frame and convert it to Base64."""
        video_path = "assets/MCT-1.1.mp4"
        return extract_frame_to_base64(video_path, frame_number)

    @staticmethod
    def update_camera(
        serial_number: str,
        # ✅ Sử dụng schema đã cập nhật
        item: CameraUpdatePoints,
        session: Session = Depends(get_db)
    ):
        db_item = session.query(Camera).filter(Camera.serial_number == serial_number).first()
        if db_item is None:
            raise HTTPException(status_code=404, detail="Item not found")

        for key, value in item.model_dump(exclude_unset=True).items():
            setattr(db_item, key, value)

        session.add(db_item)
        session.commit()
        session.refresh(db_item)
        return db_item
    
    @staticmethod
    def get_camera_by_serial_number(
        serial_number: str,
        session: Session = Depends(get_db)
    ):
        db_item = session.query(Camera).filter(Camera.serial_number == serial_number).first()
        if db_item is None:
            raise HTTPException(status_code=404, detail="Item not found")
        return db_item