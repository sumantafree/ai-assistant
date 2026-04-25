"""
DESKTOP CONTROL
---------------
PyAutoGUI + subprocess-based desktop automation.
Open apps, websites, type text, take screenshots.
"""
import subprocess
import webbrowser
import pyautogui
import time
import os
import platform
from datetime import datetime

# Disable PyAutoGUI fail-safe for production (move mouse to corner to abort)
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.3  # 300ms between actions

# ─── App paths (Windows) ──────────────────────────────────────────────────────

WINDOWS_APPS = {
    "chrome":     r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "firefox":    r"C:\Program Files\Mozilla Firefox\firefox.exe",
    "notepad":    "notepad.exe",
    "vscode":     r"C:\Users\{user}\AppData\Local\Programs\Microsoft VS Code\Code.exe",
    "calculator": "calc.exe",
    "paint":      "mspaint.exe",
    "explorer":   "explorer.exe",
    "wordpad":    "wordpad.exe",
    "cmd":        "cmd.exe",
    "powershell": "powershell.exe",
    "excel":      r"C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE",
    "word":       r"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE",
    "powerpoint": r"C:\Program Files\Microsoft Office\root\Office16\POWERPNT.EXE",
    "outlook":    r"C:\Program Files\Microsoft Office\root\Office16\OUTLOOK.EXE",
    "teams":      r"C:\Users\{user}\AppData\Local\Microsoft\Teams\current\Teams.exe",
    "spotify":    r"C:\Users\{user}\AppData\Roaming\Spotify\Spotify.exe",
    "vlc":        r"C:\Program Files\VideoLAN\VLC\vlc.exe",
    "whatsapp":   r"C:\Users\{user}\AppData\Local\WhatsApp\WhatsApp.exe",
}


def _resolve_path(path: str) -> str:
    """Replace {user} placeholder with actual Windows username."""
    username = os.environ.get("USERNAME", "User")
    return path.replace("{user}", username)


def open_application(app_name: str) -> bool:
    """
    Open a desktop application by name.

    Args:
        app_name: Application name (case-insensitive)

    Returns:
        True if launched successfully
    """
    app_name_lower = app_name.lower().strip()

    # Direct lookup
    if app_name_lower in WINDOWS_APPS:
        path = _resolve_path(WINDOWS_APPS[app_name_lower])
        try:
            subprocess.Popen([path], shell=True)
            return True
        except FileNotFoundError:
            # Fallback: try as plain command
            subprocess.Popen(app_name_lower, shell=True)
            return True

    # Fuzzy match
    for key, path in WINDOWS_APPS.items():
        if app_name_lower in key or key in app_name_lower:
            resolved = _resolve_path(path)
            subprocess.Popen(resolved, shell=True)
            return True

    # Last resort: run as command
    subprocess.Popen(app_name, shell=True)
    return True


def open_website(url: str) -> bool:
    """
    Open a URL in the default browser.

    Args:
        url: Full URL (https://...) or domain (google.com)

    Returns:
        True if opened
    """
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return True


def type_text(text: str, interval: float = 0.05) -> bool:
    """
    Type text using PyAutoGUI keyboard simulation.

    Args:
        text: Text to type
        interval: Delay between keystrokes

    Returns:
        True if successful
    """
    time.sleep(0.5)  # Give focus time
    pyautogui.typewrite(text, interval=interval)
    return True


def press_key(key: str) -> bool:
    """Press a single key (enter, tab, escape, etc.)."""
    pyautogui.press(key)
    return True


def hotkey(*keys: str) -> bool:
    """Press a keyboard shortcut (e.g., hotkey('ctrl', 'c'))."""
    pyautogui.hotkey(*keys)
    return True


def take_screenshot(save_dir: str = None) -> str:
    """
    Take a screenshot and save it.

    Returns:
        Path to saved screenshot
    """
    if save_dir is None:
        save_dir = os.path.join(os.path.expanduser("~"), "Pictures", "AIAssistant")
    os.makedirs(save_dir, exist_ok=True)

    filename = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    filepath = os.path.join(save_dir, filename)

    screenshot = pyautogui.screenshot()
    screenshot.save(filepath)
    return filepath


def search_google(query: str) -> bool:
    """Open Google search for a query."""
    import urllib.parse
    url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
    return open_website(url)


def get_screen_size() -> tuple:
    """Return (width, height) of the primary screen."""
    return pyautogui.size()


def move_mouse(x: int, y: int) -> bool:
    """Move mouse to coordinates."""
    pyautogui.moveTo(x, y, duration=0.3)
    return True


def click(x: int = None, y: int = None) -> bool:
    """Click at coordinates or current position."""
    if x and y:
        pyautogui.click(x, y)
    else:
        pyautogui.click()
    return True
