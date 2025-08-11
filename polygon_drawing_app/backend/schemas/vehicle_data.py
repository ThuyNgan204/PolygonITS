from pydantic import BaseModel
from typing import List

class ZoneData(BaseModel):
    zone: str
    number_of_motorbike: int
    number_of_car: int

class VehicleBatchData(BaseModel):
    camera_id: str
    zones: List[ZoneData]
    reset_state: bool