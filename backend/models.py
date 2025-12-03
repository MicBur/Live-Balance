from pydantic import BaseModel
from typing import List, Optional, Dict

class Clip(BaseModel):
    id: str
    upload_id: str
    segment_nr: int
    start_sec: float
    end_sec: float
    duration_sec: float
    text: str
    raw_topic: str
    final_topic: Optional[str] = None
    style: Dict
    clip_path: str

class Theme(BaseModel):
    name: str
    percent: float
    count: int

class Suggestion(BaseModel):
    id: str
    text: str
    word_count: int
    topic: str
