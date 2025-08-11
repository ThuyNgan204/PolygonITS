from typing import Optional

from pydantic import BaseModel

# Pydantic Schemas
class CameraBase(BaseModel):
    serial_number: str
    name: str
    points: list
    class Config:
        orm_mode = True

class CameraCreate(CameraBase):
    pass

class CameraShow(CameraBase):
    image: Optional[str]

class CameraUpdatePoints(BaseModel):
    points: list

