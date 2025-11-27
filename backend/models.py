from pydantic import BaseModel
from typing import List, Optional

class QuizMeta(BaseModel):
    id: str
    name: str
    label_x: str
    label_y: str
    count_x: int
    count_y: int
    total_images: int
    created_at: str

class GameRoundDefinition(BaseModel):
    """Represents a single round in the game."""
    imageUrl: str   # Path to the image, e.g., "static/quizzes/{id}/x_images/filename.jpg"
    label: str      # The correct answer: "x" or "y"
class QuizListResponse(BaseModel):
    quizzes: List[QuizMeta]

class Question(BaseModel):
    image_url: str
    correct_label: str # "x" or "y"
    correct_name: str  # The actual name, e.g., "Real" or "AI"

class GameSession(BaseModel):
    quiz_id: str
    total_rounds: int
    questions: List[Question]