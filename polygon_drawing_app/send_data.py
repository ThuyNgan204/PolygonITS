import requests
import time
import random

# Đổi URL này nếu server của bạn chạy ở địa chỉ/cổng khác
API_URL = "http://localhost:5101/api/v1/tracking/vehicle-data-batch"
CAMERA_ID = ["SN003", "SN004"] # Thay bằng ID camera bạn đang dùng để test


def generate_mock_data(camera_id):
    """Tạo dữ liệu ngẫu nhiên để mô phỏng dữ liệu từ hệ thống AI."""
    zones = ["inner", "outer"]  # Phải trùng với tên zone trong code frontend của bạn

    zones_data = []
    for zone in zones:
        data = {
            "zone": zone,
            "number_of_motorbike": random.randint(1, 5),
            "number_of_car": random.randint(0, 3),
        }
        zones_data.append(data)
    
    payload = {
        "camera_id": camera_id,
        "zones": zones_data,
        "reset_state": False  # Thêm trường này vào
    }
    return payload

def send_data_to_api():
    """Gửi dữ liệu đến API mỗi 0.01 giây."""
    while True:
        for camera_id in CAMERA_ID:
            data_to_send = generate_mock_data(camera_id)
            try:
                response = requests.post(API_URL, json=data_to_send)
                response.raise_for_status()  # Ném lỗi nếu status code không phải 2xx
                print(f"[{time.strftime('%H:%M:%S')}] Đã gửi dữ liệu thành công cho camera {CAMERA_ID}. Trạng thái: {response.status_code}")
                # print("Dữ liệu phản hồi:", response.json())
            except requests.exceptions.RequestException as e:
                print(f"[{time.strftime('%H:%M:%S')}] Lỗi khi gửi dữ liệu: {e}")
        
        time.sleep(0.01)
if __name__ == "__main__":
    print("Bắt đầu gửi dữ liệu giả lập...")
    send_data_to_api()