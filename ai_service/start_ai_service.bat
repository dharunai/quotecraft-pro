@echo off
echo Starting Genworks AI CRM Backend...
echo.
echo Python AI Service will be available at http://localhost:8000
echo Press Ctrl+C to stop.
echo.
"C:\Users\PROACCOUNTS11\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
