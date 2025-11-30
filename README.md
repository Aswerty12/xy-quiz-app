# Introduction

This project is a local full-stack application built to strengthen my portfolio, inspired by the quiz interface at realorai.dev.
The frontend is developed with Angular, while the backend is powered by Python, which manages file uploads, extraction, and local data storage through JSON files and the host machine’s file system.

The goal of this app is to provide a simple, extensible quiz/game platform in which users are shown an image and must classify it between two labels—for example, real vs. AI-generated, jpeg or png,nor ripe vs. unripe banana.

This platform is designed to be used for local testing, prototyping, or academic research. Students or researchers can use it directly for their experiments or fork and adapt it for more specialized use cases.

Contributors are welcome to make their own fork. 

# How to use
## Uploading a Quiz set
1. Prepare a two sets of comparable / contrasting images. 
2. Activate both frontend and backend
3. Go to upload page from the front page
4. Set a quiz name, and names for the labels. 
5. Upload the two sets
6. Go to the play page to check.

# Housekeeping
## Steps for installing python venv for running the app:
1. cd backend
2. Create virtual env: python -m venv venv
3. Activate env:
    Windows: venv\Scripts\activate
    Mac/Linux: source venv/bin/activate
4. Install FastAPI: pip install fastapi uvicorn python-multipart
5. Command to turn on api: (While in backend folder) > uvicorn main:app --reload *(Note: this is for testing; for regular use, run 'python main.py' as described below)*
6. Ctrl+ C to quit out of the API for now

## Steps for deploying afterwards
1. `cd backend`
2. Activate env:
    Windows: `venv\Scripts\activate`
    Mac/Linux: `source venv/bin/activate`
3. `python main.py` will activate the backend API

## Steps for deploying frontend
1. `cd frontend` from root folder
2. `npm install` to install the relevant npm packages
3. **Important:** Make sure the backend is live first.
4. `ng serve` to deploy frontend

### Front after first time
4. Run via `ng serve`

## Running tests
1. Run `ng test` --watch=false (*--watch=false is optional mostly meant to double check that nothing on the frontend has been broken.*)
2. Run `ng serve` and then perform a point-to-point test (upload -> play -> delete).

# Reference Dev notes
This will be the location for locally testing the API when main.py is run http://localhost:8000/docs
As of now, this app has only been tested on Macos, if anyone has a PC and wants to test this for fun I'd love to hear any issues and feedback.