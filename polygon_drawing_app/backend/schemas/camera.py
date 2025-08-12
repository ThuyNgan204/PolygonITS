from typing import List, Optional, Dict, Any

from pydantic import BaseModel

# ✅ Cập nhật schema để sử dụng Dict[str, Any] cho mỗi zone
class CameraBase(BaseModel):
    serial_number: str
    name: str
    points: List[Dict[str, Any]]
    
    class Config:
        orm_mode = True

class CameraCreate(CameraBase):
    pass

class CameraShow(CameraBase):
    image: Optional[str]

class CameraUpdatePoints(BaseModel):
    points: List[Dict[str, Any]]