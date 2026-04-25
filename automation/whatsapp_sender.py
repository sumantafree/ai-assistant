"""
WHATSAPP SENDER
---------------
Selenium-based WhatsApp Web automation.

Requirements:
  - Google Chrome installed
  - First run: scan QR code (session is saved after that)

Usage:
  send_message("+919876543210", "Hello!")
"""
import time
import os
import sys
import urllib.parse
from typing import List, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

# WhatsApp Web URL
WA_WEB_URL = "https://web.whatsapp.com"

# Chrome profile to persist WhatsApp session
CHROME_PROFILE_DIR = os.path.join(
    os.path.expanduser("~"), "AppData", "Local", "AI-Assistant", "ChromeProfile"
)


def _get_driver(headless: bool = False) -> webdriver.Chrome:
    """Create a Chrome WebDriver with persistent profile."""
    os.makedirs(CHROME_PROFILE_DIR, exist_ok=True)

    options = Options()
    options.add_argument(f"--user-data-dir={CHROME_PROFILE_DIR}")
    options.add_argument("--profile-directory=Default")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    if headless:
        options.add_argument("--headless=new")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.maximize_window()
    return driver


def send_message(
    phone: str,
    message: str,
    wait_for_qr: bool = True,
    timeout: int = 60,
) -> dict:
    """
    Send a WhatsApp message to a phone number.

    Args:
        phone: Phone number with country code (e.g., +919876543210)
        message: Message to send
        wait_for_qr: If True, wait for QR code scan on first use
        timeout: Seconds to wait for elements

    Returns:
        {"success": bool, "result": str, "error": str}
    """
    driver = None
    try:
        driver = _get_driver(headless=False)

        # Direct link approach (faster than searching)
        encoded_msg = urllib.parse.quote(message)
        clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        url = f"{WA_WEB_URL}/send?phone={clean_phone}&text={encoded_msg}"

        driver.get(url)

        wait = WebDriverWait(driver, timeout)

        # Wait for QR code or chat to load
        if wait_for_qr:
            # Wait until either QR code appears OR chat input appears
            wait.until(
                lambda d: _is_logged_in(d) or _needs_qr(d)
            )

            if _needs_qr(driver):
                print("[WhatsApp] Please scan QR code in the browser window...")
                # Wait longer for QR scan
                qr_wait = WebDriverWait(driver, 120)
                qr_wait.until(lambda d: _is_logged_in(d))
                print("[WhatsApp] Logged in successfully!")

        # Wait for message input box
        msg_box = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'div[data-tab="10"]'))
        )

        # Clear and type message
        msg_box.click()
        time.sleep(0.5)

        # Handle multi-line messages
        lines = message.split("\n")
        for i, line in enumerate(lines):
            msg_box.send_keys(line)
            if i < len(lines) - 1:
                msg_box.send_keys(Keys.SHIFT + Keys.ENTER)

        time.sleep(0.5)
        msg_box.send_keys(Keys.ENTER)
        time.sleep(2)

        return {"success": True, "result": f"Message sent to {phone}"}

    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if driver:
            time.sleep(1)
            driver.quit()


def _is_logged_in(driver) -> bool:
    """Check if WhatsApp Web is logged in."""
    try:
        return bool(driver.find_elements(By.CSS_SELECTOR, 'div[data-tab="10"]'))
    except Exception:
        return False


def _needs_qr(driver) -> bool:
    """Check if QR code scan is needed."""
    try:
        return bool(driver.find_elements(By.CSS_SELECTOR, "canvas[aria-label='Scan me!']"))
    except Exception:
        return False


def send_bulk_messages(contacts: List[dict], message_template: str) -> List[dict]:
    """
    Send personalized WhatsApp messages to multiple contacts.

    Args:
        contacts: List of {"phone": "+91...", "name": "...", ...}
        message_template: Template with {name} placeholder

    Returns:
        List of send results
    """
    results = []
    for contact in contacts:
        name = contact.get("name", "")
        phone = contact.get("phone", "")
        message = message_template.replace("{name}", name)

        for key, value in contact.items():
            message = message.replace(f"{{{key}}}", str(value))

        result = send_message(phone, message)
        result["phone"] = phone
        result["name"] = name
        results.append(result)

        # Delay between messages to avoid bans
        time.sleep(3)

    return results


def send_message_via_api(phone: str, message: str) -> dict:
    """
    Alternative: Open WhatsApp Web directly without Selenium.
    Opens in browser — user clicks send manually.
    """
    import webbrowser
    encoded_msg = urllib.parse.quote(message)
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    url = f"https://api.whatsapp.com/send?phone={clean_phone}&text={encoded_msg}"
    webbrowser.open(url)
    return {"success": True, "result": f"WhatsApp opened for {phone}"}
