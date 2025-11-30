import os
import json
import shutil
import uuid
import random
import zipfile
from datetime import datetime
from typing import List, Optional

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
QUIZZES_DIR = os.path.join(STATIC_DIR, "quizzes")
DB_FILE = os.path.join(BASE_DIR, "db.json")

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

# Ensure directories exist
os.makedirs(QUIZZES_DIR, exist_ok=True)

def get_db() -> List[dict]:
    """Reads the JSON database."""
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_db(data: List[dict]):
    """Writes to the JSON database."""
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def validate_image(filename: str) -> bool:
    """
    Checks if a file is a valid image.
    1. Must have valid extension.
    2. Must NOT start with '._' (macOS metadata file) or '.' (hidden system file).
    """
    if filename.startswith("._") or filename.startswith("."):
        return False
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

def process_upload(name: str, label_x: str, label_y: str, zip_x: bytes, zip_y: bytes) -> dict:
    """
    Extracts zips, filters images, and updates DB.
    """
    quiz_id = str(uuid.uuid4())
    quiz_path = os.path.join(QUIZZES_DIR, quiz_id)
    path_x = os.path.join(quiz_path, "x_images")
    path_y = os.path.join(quiz_path, "y_images")

    os.makedirs(path_x)
    os.makedirs(path_y)

    def extract_and_filter(zip_bytes, target_folder):
        count = 0
        # Create a temporary sandbox folder for extraction
        temp_extract_path = os.path.join(target_folder, "_temp_extract")
        os.makedirs(temp_extract_path, exist_ok=True)
        
        temp_zip_path = os.path.join(temp_extract_path, "temp.zip")
        
        # Write bytes to temp zip
        with open(temp_zip_path, "wb") as f:
            f.write(zip_bytes)
        
        try:
            # Extract to the sandbox
            with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_extract_path)
            
            # Remove the zip file itself so we don't walk it
            os.remove(temp_zip_path)

            # Walk the sandbox
            for root, dirs, files in os.walk(temp_extract_path):
                # Ignore __MACOSX directories explicitly to speed things up
                if "__MACOSX" in dirs:
                    dirs.remove("__MACOSX")

                for file in files:
                    if validate_image(file):
                        src = os.path.join(root, file)
                        # Rename to ensure uniqueness using a short UUID
                        unique_name = f"{uuid.uuid4().hex[:8]}_{file}"
                        dst = os.path.join(target_folder, unique_name)
                        
                        # Move file out of sandbox to target_folder
                        shutil.move(src, dst)
                        count += 1
        
        except zipfile.BadZipFile:
            print(f"Error: Invalid zip file uploaded.")
        finally:
            # NUKE THE SANDBOX
            # This deletes the _temp_extract folder and EVERYTHING inside it
            # (including empty folders, .DS_Store, ._ files, __MACOSX, etc.)
            if os.path.exists(temp_extract_path):
                shutil.rmtree(temp_extract_path)
        
        return count

    count_x = extract_and_filter(zip_x, path_x)
    count_y = extract_and_filter(zip_y, path_y)

    # Create Meta Object
    new_quiz = {
        "id": quiz_id,
        "name": name,
        "label_x": label_x,
        "label_y": label_y,
        "count_x": count_x,
        "count_y": count_y,
        "total_images": count_x + count_y,
        "created_at": datetime.now().isoformat()
    }

    # Save metadata file in folder
    with open(os.path.join(quiz_path, "meta.json"), "w") as f:
        json.dump(new_quiz, f)

    # Update Master DB
    current_db = get_db()
    current_db.append(new_quiz)
    save_db(current_db)

    return new_quiz

def generate_game_session(quiz_id: str, limit: int) -> Optional[List[dict]]:
    """
    Generates a randomized list of game rounds for the quiz.
    Returns a list of GameRoundDefinition objects (dicts with imageUrl and label).
    """
    db = get_db()
    quiz = next((q for q in db if q["id"] == quiz_id), None)
    if not quiz:
        return None

    path_x = os.path.join(QUIZZES_DIR, quiz_id, "x_images")
    path_y = os.path.join(QUIZZES_DIR, quiz_id, "y_images")

    # Get all valid images
    images_x = [f for f in os.listdir(path_x) if validate_image(f)]
    images_y = [f for f in os.listdir(path_y) if validate_image(f)]

    # Create pool of questions
    pool = []
    for img in images_x:
        pool.append((img, "x"))
    for img in images_y:
        pool.append((img, "y"))

    # Shuffle completely
    random.shuffle(pool)

    # Slice to requested rounds (or max available)
    selected_pool = pool[:limit]

    # Transform to GameRoundDefinition format
    rounds = []
    for filename, label_type in selected_pool:
        folder = "x_images" if label_type == "x" else "y_images"
        # Path should NOT have a leading slash, as it's combined with a base URL on the frontend.
        image_url = f"static/quizzes/{quiz_id}/{folder}/{filename}"
        
        rounds.append({
            "imageUrl": image_url,
            "label": label_type
        })

    return rounds

def delete_quiz(quiz_id: str) -> bool:
    """
    Deletes a quiz from the database and removes its files.
    Returns True if deleted, False if not found.
    """
    db = get_db()
    quiz = next((q for q in db if q["id"] == quiz_id), None)
    
    if not quiz:
        return False
    
    # 1. Remove from DB list
    new_db = [q for q in db if q["id"] != quiz_id]
    save_db(new_db)
    
    # 2. Remove directory from filesystem
    quiz_path = os.path.join(QUIZZES_DIR, quiz_id)
    if os.path.exists(quiz_path):
        try:
            shutil.rmtree(quiz_path)
        except OSError as e:
            print(f"Error deleting folder {quiz_path}: {e}")
            # We continue even if file deletion fails, as the DB entry is gone
            
    return True