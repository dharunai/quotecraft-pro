# Genworks AI Service

This is the Python ML backend for the Genworks AI CRM dashboard.

## How to Start

Double-click `start_ai_service.bat` or run in terminal:

```bash
cd ai_service
python -m uvicorn main:app --port 8000 --reload
```

The service runs on **http://localhost:8000** and must be active for the Dashboard AI Insights to work.

## Endpoints

- `GET /` — Health check
- `POST /api/generate-insights` — Generates ML insights + next best actions from deals, leads & tasks

## Libraries Used

- **FastAPI** — REST API framework
- **scikit-learn** — Random Forest Classifier for deal close prediction
- **pandas** — Data crunching for trends, stalled deals, and follow-ups
- **uvicorn** — ASGI server
