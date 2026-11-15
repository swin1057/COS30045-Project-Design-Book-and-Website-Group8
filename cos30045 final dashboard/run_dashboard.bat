@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto missing_node

where npm >nul 2>nul
if errorlevel 1 goto missing_npm

if not exist "node_modules\.bin\vite.cmd" (
    echo Installing dashboard dependencies. This may take a few minutes...
    call npm ci
    if errorlevel 1 goto failed
)

echo Starting the Vue/Vuetify Australian Road Safety Dashboard...
echo Keep this window open while using the dashboard.
echo Press Ctrl+C to stop the server.
call npm run dev -- --host 127.0.0.1 --open /
if errorlevel 1 goto failed
goto finished

:missing_node
echo Node.js is required to run this dashboard.
echo Install the current LTS version from https://nodejs.org/ and then run this file again.
goto failed

:missing_npm
echo npm was not found. Reinstall Node.js from https://nodejs.org/ with npm included.
goto failed

:failed
echo.
echo The dashboard could not be started. Review the error above, then press any key to close.
pause >nul
exit /b 1

:finished
echo.
echo Dashboard server stopped.
pause >nul
endlocal
