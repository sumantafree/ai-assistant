; Custom NSIS installer hooks
; Adds a "Configure API Key" page hint after installation

!macro customInstall
  ; Create a README in the install directory
  FileOpen $0 "$INSTDIR\SETUP_GUIDE.txt" w
  FileWrite $0 "AI Desktop Assistant - Quick Setup$\r$\n"
  FileWrite $0 "=================================$\r$\n$\r$\n"
  FileWrite $0 "1. Open the 'resources\backend' folder$\r$\n"
  FileWrite $0 "2. Edit the '.env' file with Notepad$\r$\n"
  FileWrite $0 "3. Add your GEMINI_API_KEY$\r$\n"
  FileWrite $0 "   Get free key: https://aistudio.google.com/app/apikey$\r$\n$\r$\n"
  FileWrite $0 "4. (Optional) Add Gmail App Password for email features$\r$\n$\r$\n"
  FileWrite $0 "Default login: admin / admin123$\r$\n"
  FileClose $0

  ; Open setup guide after install
  ExecShell "open" "$INSTDIR\SETUP_GUIDE.txt"
!macroend

!macro customUnInstall
  ; Nothing extra on uninstall
!macroend
