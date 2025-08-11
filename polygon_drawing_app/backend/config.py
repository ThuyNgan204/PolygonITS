import os

PROJECT_NAME = os.getenv("PROJECT_NAME", "Camera Data")
PROJECT_VERSION = os.getenv("PROJECT_VERSION", "1.0.0")

#localhost:127.0.0.1:54444
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING", "postgresql://postgres:123456@localhost:5432/testdb")

RTMP_STREAMS = {
    "SN003": "rtmp://localhost:1935/app/stream1?tcp",
    "SN004": "rtmp://localhost:1935/app/stream2?tcp",
}

# Default video path for testing
DEFAULT_VIDEO_PATH = "/Users/dangnguyen/Downloads/input/NguyenOanh-PhanVanTri-01.mp4"

VIDEO_FPS = 30