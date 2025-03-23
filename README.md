# Chat Application with User Requests

A real-time chat application built with Django Channels and React, featuring user request functionality.

## Features
- Real-time chat using WebSocket
- User request system (send/approve/reject)
- Mutual likes list
- User authentication

## Setup Instructions

### Backend Setup
1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run migrations:
```bash
python manage.py migrate
```

4. Start Redis server (required for Django Channels)

5. Run the Django server:
```bash
python manage.py runserver
```

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Project Structure
- `backend/` - Django project with Channels
- `frontend/` - React application
- `requirements.txt` - Python dependencies 