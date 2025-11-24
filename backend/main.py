# backend/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# 1. Setup the file storage folder
OS_PATH = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(OS_PATH, "quizzes")
os.makedirs(STATIC_DIR, exist_ok=True)

# 2. Mount the folder so frontend can see images
# Accessible at http://localhost:8000/static/image.jpg
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 3. Test Endpoint
@app.get("/api/health")
def read_root():
    return {"status": "online", "backend": "python_fastapi"}