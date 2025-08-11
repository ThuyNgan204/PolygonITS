from fastapi import APIRouter

from apis.v1.route_camera import CameraController
from apis.v1.route_tracking import TrackingController

api_router = APIRouter()

# Controller
camera_controller = CameraController()
tracking_controller = TrackingController()

# Routes
api_router.include_router(camera_controller.router, prefix="/api/v1/camera", tags=["Camera"])
api_router.include_router(tracking_controller.router, prefix="/api/v1/tracking", tags=["Tracking"])