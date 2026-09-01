@echo off
cd /d "%~dp0"
echo Starting ParkFlow at http://127.0.0.1:5500/
echo Press Ctrl+C to stop the server.
python -m http.server 5500
pause
