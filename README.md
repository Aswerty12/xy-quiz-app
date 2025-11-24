# Introduction

This is a local full stack project made to improve my portfolio inspired by seeing the quiz interface from https://realorai.dev/. The frontend is generated via Angular, while the backend uses python to manage the uploading and unzipping of 
files; with data storage handled locally via json and the file system of the computer this app will run on.

The intent is to create a simple game/quiz system for future use where the user image is shown and the user has to determine if it's one label or another. Say, determine if it's a real or ai image, or determine if a particular image is of a ripe or unripe banana. With the intent of creating an automatic, local testing platform for any students to either use this for their own research directly or for them to fork this project to specialize for their own research.

# Housekeeping
Steps for installing python venv for running the app:
1. cd backend
2. Create virtual env: python -m venv venv
3. Activate env:
    Windows: venv\Scripts\activate
    Mac/Linux: source venv/bin/activate
4. Install FastAPI: pip install fastapi uvicorn python-multipart
Command to turn on api: (While in backend folder) > uvicorn main:app --reload

Steps for deploying
1. ng serve