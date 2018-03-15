@ECHO OFF

SETLOCAL

SET "NODE_BIN=%~dp0\lib\node\node.exe"
SET "FERRET_BIN=%~dp0\node_modules\@forthright\ferret\bin\ferret"
SET "FERRET_PLUGINS_PATH=%~dp0"

"%NODE_EXE%" "%FERRET_BIN%" %*
