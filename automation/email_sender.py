"""
EMAIL SENDER
------------
Gmail SMTP email sending with HTML support.
Uses App Password (not OAuth) for simplicity.

Setup:
  1. Enable 2FA on your Gmail account
  2. Go to https://myaccount.google.com/apppasswords
  3. Generate an App Password for "Mail"
  4. Add it to .env as SMTP_PASSWORD
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings


def send_email(
    to_email: str,
    subject: str,
    body: str,
    html: bool = False,
    cc: Optional[List[str]] = None,
    attachments: Optional[List[str]] = None,
) -> dict:
    """
    Send an email via Gmail SMTP.

    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body (plain text or HTML)
        html: If True, body is treated as HTML
        cc: List of CC email addresses
        attachments: List of file paths to attach

    Returns:
        {"success": bool, "result": str, "error": str}
    """
    try:
        # Build message
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
        msg["To"] = to_email
        msg["Subject"] = subject

        if cc:
            msg["Cc"] = ", ".join(cc)

        # Attach body
        part = MIMEText(body, "html" if html else "plain")
        msg.attach(part)

        # Attach files
        if attachments:
            for filepath in attachments:
                if os.path.exists(filepath):
                    with open(filepath, "rb") as f:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename={os.path.basename(filepath)}",
                    )
                    msg.attach(part)

        # Send via SMTP
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            recipients = [to_email]
            if cc:
                recipients.extend(cc)
            server.sendmail(settings.SMTP_USER, recipients, msg.as_string())

        return {"success": True, "result": f"Email sent to {to_email}"}

    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "error": "Gmail authentication failed. Check SMTP_USER and SMTP_PASSWORD in .env",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def send_bulk_emails(recipients: List[dict], subject: str, body_template: str) -> List[dict]:
    """
    Send personalized bulk emails.

    Args:
        recipients: List of dicts with "email" and "name" keys
        subject: Email subject (supports {name} placeholder)
        body_template: Body with {name}, {email} placeholders

    Returns:
        List of send results
    """
    results = []
    for recipient in recipients:
        name = recipient.get("name", "")
        email = recipient.get("email", "")

        personalized_subject = subject.replace("{name}", name)
        personalized_body = body_template.replace("{name}", name).replace("{email}", email)

        result = send_email(email, personalized_subject, personalized_body)
        result["recipient"] = email
        results.append(result)

    return results


def send_html_email(to_email: str, subject: str, html_body: str) -> dict:
    """Convenience wrapper for HTML emails."""
    return send_email(to_email, subject, html_body, html=True)
