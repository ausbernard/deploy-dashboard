# Deploy Dashboard

A read-only service that proxies a platform API, reshapes the data, and surfaces deploy health across projects.

<img src="/assets/railway_health_proxy_pixel_train.svg" alt="railway_health_proxy_pixel_train" />

## Stack

## Structure
```
deploy-dashboard/
├── backend/    # FastAPI service
└── frontend/   # Vite + React app
```

## Running the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then visit `http://localhost:8000/docs` to try the API.

## Configuration

Create `backend/.env` (not committed):

```
RAILWAY_TOKEN=your_account_token
RAILWAY_PROJECT_ID=...
RAILWAY_SERVICE_ID=...
```

Use a Railway **account** token (created with "No workspace"), not a project token.

## API

`GET /api/status` returns the latest deploy and recent history for a service:

```json
{
  "latest": { "id": "...", "status": "SUCCESS", "createdAt": "..." },
  "history": [ { "id": "...", "status": "FAILED", "createdAt": "..." } ]
}
```