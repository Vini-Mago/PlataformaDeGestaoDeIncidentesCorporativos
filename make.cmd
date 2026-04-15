@echo off
setlocal

set "TARGET=%~1"
if "%TARGET%"=="" set "TARGET=help"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make.ps1" %TARGET%
exit /b %ERRORLEVEL%
