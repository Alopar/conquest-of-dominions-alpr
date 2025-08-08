@echo off
set PORT=9000

echo Running a local server on port %PORT%...
echo Server will be available at: http://localhost:%PORT%
echo.
echo Press Ctrl+C to stop the server
echo.

python -m http.server %PORT%

pause