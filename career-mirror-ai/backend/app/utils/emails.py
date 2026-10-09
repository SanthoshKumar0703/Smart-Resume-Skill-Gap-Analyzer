"""SMTP email delivery with a clearly-marked development fallback."""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, parseaddr

from app.config import settings

logger = logging.getLogger("careermirror.email")


def _clean_from() -> tuple[str, str]:
    name, addr = parseaddr(settings.SMTP_FROM)
    if not addr:
        addr = settings.SMTP_FROM
    return name or "Career Mirror AI", addr


def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None):
    """Send an email via SMTP. Raises RuntimeError with a clear message on failure."""
    if not settings.smtp_configured:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME and SMTP_PASSWORD in backend/.env"
        )

    from_name, from_addr = _clean_from()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name, from_addr))
    msg["To"] = to_email
    msg.attach(MIMEText(text_body or "Please view this email in an HTML-capable client.", "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
            if settings.SMTP_USE_TLS:
                server.starttls()
        try:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(from_addr, [to_email], msg.as_string())
        finally:
            server.quit()
        logger.info("Email sent to %s (subject: %s)", to_email, subject)
    except smtplib.SMTPAuthenticationError as exc:
        raise RuntimeError("SMTP authentication failed. Check SMTP_USERNAME / SMTP_PASSWORD.") from exc
    except smtplib.SMTPException as exc:
        raise RuntimeError(f"Password reset email could not be sent: {exc}") from exc
    except OSError as exc:
        raise RuntimeError(
            f"Could not reach the SMTP server at {settings.SMTP_HOST}:{settings.SMTP_PORT}."
        ) from exc


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    subject = "Reset your Career Mirror AI password"
    html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;
                border:1px solid #e6e1d6;border-radius:14px;overflow:hidden;">
      <div style="background:#0c1a26;padding:22px 28px;">
        <span style="color:#ffffff;font-weight:700;font-size:17px;letter-spacing:.4px;">
          Career Mirror AI</span>
      </div>
      <div style="padding:28px;">
        <h2 style="color:#0c1a26;margin-top:0;">Reset your password</h2>
        <p style="color:#444;">We received a request to reset your password.
           This link is valid for <strong>60 minutes</strong> and can be used once.</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="{reset_url}"
             style="background:#0e7a5f;color:#fff;text-decoration:none;padding:12px 26px;
                    border-radius:10px;font-weight:600;display:inline-block;">
             Reset password</a>
        </p>
        <p style="color:#777;font-size:12px;">If you did not request this, you can safely ignore
           this email. <br>Or copy this link: {reset_url}</p>
      </div>
    </div>
    """
    send_email(to_email, subject, html, text_body=f"Reset your Career Mirror AI password: {reset_url}")


def log_dev_reset_link(to_email: str, reset_url: str) -> None:
    """Development fallback: print the reset link to the backend console."""
    border = "=" * 74
    logger.info(
        "\n%s\n  [DEV MODE] Password reset requested for %s\n"
        "  SMTP is NOT configured, so no email was sent.\n"
        "  Open this link to reset the password:\n\n  %s\n%s",
        border, to_email, reset_url, border,
    )
