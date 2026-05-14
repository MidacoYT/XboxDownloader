@echo off
color 2
title GDK Helper by online-fix.me
echo GDK Helper & echo.

:begin
echo 1. Install game
echo 2. Install DLC
echo 3. Enable Developer Mode
echo 4. Disable Developer Mode
echo 5. Exit

set /p action="Choose action: "

IF NOT "%action%" == "1" ( IF NOT "%action%" == "2" ( IF NOT "%action%" == "3" ( IF NOT "%action%" == "4" ( IF NOT "%action%" == "5" (  goto begin ) ) ) ) )

IF "%action%" == "1" ( goto gameinstall )
IF "%action%" == "2" ( goto dlcinstall )
IF "%action%" == "3" ( goto developeron )
IF "%action%" == "4" ( goto developeroff )
IF "%action%" == "5" ( goto exit )

:developeron
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d "1"
goto begin

:developeroff
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d "0"
goto begin

:gameinstall
set file_check="%~dp0AppxSignature.p7x"
set file_check_new="AppxSignature.tmp"

IF EXIST %file_check% ( REN %file_check% %file_check_new% )

"%~dp0wdapp" register "%~dp0appxmanifest.xml"
goto begin

:dlcinstall
set dlc_directory="%~dp0MicrosoftStore_DLC\\"

IF EXIST %dlc_directory% ( cd /D %dlc_directory% )

IF EXIST %dlc_directory% ( FOR /D %%I in (*) DO IF EXIST "%%I" ( "%~dp0wdapp" register "%CD%\%%I" ) ) ELSE ( echo DLC directory does not exist. )

IF EXIST %dlc_directory% ( cd .. )
goto begin

:exit