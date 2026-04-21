@echo off
echo Запуск приложения...
start http://localhost:8000
cd dist
python -m http.server 8000
pause
