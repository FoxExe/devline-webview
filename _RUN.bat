@echo off

rem Ensure this Node.js and npm are first in the PATH
set "PATH=%~dp0;%PATH%"

setlocal enabledelayedexpansion
pushd "%~dp0"

rem Figure out the Node.js version.
set print_version=.\node.exe -p -e "process.versions.node + ' (' + process.arch + ')'"
for /F "usebackq delims=" %%v in (`%print_version%`) do set version=%%v

echo Node.js !version!
echo Running app.js...

popd
endlocal

start http://localhost/
:RUNAPP
node app.js
goto RUNAPP
