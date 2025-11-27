from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
import uvicorn

# Import internal modules
from models import QuizMeta, GameRoundDefinition
import services

app = FastAPI(title="X or Y Quizmaker Backend")

# 1. CORS Configuration
# Allow Angular (usually port 4200) to talk to Python (port 8000)
origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Mount Static Files
# This serves the images directly
app.mount("/static", StaticFiles(directory=services.STATIC_DIR), name="static")

# --- ROUTES ---

@app.get("/api/health")
def health_check():
    return {"status": "online", "backend": "FastAPI"}

@app.post("/api/upload", response_model=QuizMeta)
async def upload_quiz(
    name: str = Form(...),
    label_x: str = Form(...),
    label_y: str = Form(...),
    file_x: UploadFile = File(...),
    file_y: UploadFile = File(...)
):
    """
    Receives two zip files and metadata. 
    Extracts images, validates them, and creates a new quiz entry.
    """
    # Read bytes from uploaded files
    zip_x_bytes = await file_x.read()
    zip_y_bytes = await file_y.read()
    
    try:
        new_quiz = services.process_upload(
            name=name, 
            label_x=label_x, 
            label_y=label_y, 
            zip_x=zip_x_bytes, 
            zip_y=zip_y_bytes
        )
        return new_quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quizzes", response_model=List[QuizMeta])
def list_quizzes():
    """Returns a list of all available quizzes."""
    return services.get_db()

@app.get("/api/quiz/{quiz_id}/start", response_model=List[GameRoundDefinition])
def start_quiz(quiz_id: str, limit: int = 10):
    """
    Initializes a game session and returns a randomized list of rounds.
    
    Args:
        quiz_id: The quiz ID
        limit: Number of rounds to return (default: 10)
    
    Returns:
        List of GameRoundDefinition objects with imageUrl and label
    """
    rounds = services.generate_game_session(quiz_id, limit)
    if rounds is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return rounds

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)