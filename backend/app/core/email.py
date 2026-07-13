import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_invite_email(to_email: str, full_name: str, activation_link: str) -> None:
    message = EmailMessage()
    message["Subject"] = "You're invited to LeaveOps"
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email

    message.set_content(
        f"""Hi {full_name},

You've been added to LeaveOps, your company's leave management system.

Set up your account and choose a password here:
{activation_link}

This link expires in {settings.INVITE_TOKEN_EXPIRE_HOURS} hours.

If you weren't expecting this, you can ignore this email.

- LeaveOps HR
"""
    )

    message.add_alternative(
        f"""\
<html>
  <body style="font-family: sans-serif; color: #1c1917; line-height: 1.6;">
    <p>Hi {full_name},</p>
    <p>You've been added to <strong>LeaveOps</strong>, your company's leave management system.</p>
    <p>
      <a href="{activation_link}"
         style="display:inline-block; padding:12px 20px; background:#d97706; color:#ffffff;
                border-radius:10px; text-decoration:none; font-weight:600;">
        Set up your account
      </a>
    </p>
    <p style="color:#57534e; font-size:13px;">This link expires in {settings.INVITE_TOKEN_EXPIRE_HOURS} hours.</p>
    <p style="color:#57534e; font-size:13px;">If you weren't expecting this, you can ignore this email.</p>
    <p>- LeaveOps HR</p>
  </body>
</html>
""",
        subtype="html",
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)

def send_email_change_verification(to_email: str, full_name: str, verify_link: str, expire_hours: int) -> None:
    """Sent to the NEW address only. The old address keeps working until this is clicked."""
    message = EmailMessage()
    message["Subject"] = "Confirm your new LeaveOps email address"
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    message.set_content(
        f"""Hi {full_name},

We received a request to change the email address on your LeaveOps account to this address.

Confirm the change here:
{verify_link}

This link expires in {expire_hours} hour(s).

If you didn't request this, ignore this email and your account's email address will not change.

- LeaveOps HR
"""
    )
    message.add_alternative(
        f"""\
<html>
  <body style="font-family: sans-serif; color: #1c1917; line-height: 1.6;">
    <p>Hi {full_name},</p>
    <p>We received a request to change the email address on your <strong>LeaveOps</strong> account to this address.</p>
    <p>
      <a href="{verify_link}"
         style="display:inline-block; padding:12px 20px; background:#d97706; color:#ffffff;
                border-radius:10px; text-decoration:none; font-weight:600;">
        Confirm new email
      </a>
    </p>
    <p style="color:#57534e; font-size:13px;">This link expires in {expire_hours} hour(s).</p>
    <p style="color:#57534e; font-size:13px;">If you didn't request this, ignore this email and your account's email address will not change.</p>
    <p>- LeaveOps HR</p>
  </body>
</html>
""",
        subtype="html",
    )
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)


def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> None:
    message = EmailMessage()
    message["Subject"] = "Reset your LeaveOps password"
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    message.set_content(
        f"""Hi {full_name},

We received a request to reset your LeaveOps password. Click the link below to choose a new one:

{reset_link}

This link expires in {settings.RESET_TOKEN_EXPIRE_HOURS} hour(s).

If you didn't request this, you can safely ignore this email — your password will not be changed.

- LeaveOps HR
"""
    )
    message.add_alternative(
        f"""\
<html>
  <body style="font-family: sans-serif; color: #1c1917; line-height: 1.6;">
    <p>Hi {full_name},</p>
    <p>We received a request to reset your <strong>LeaveOps</strong> password.</p>
    <p>
      <a href="{reset_link}"
         style="display:inline-block; padding:12px 20px; background:#d97706; color:#ffffff;
                border-radius:10px; text-decoration:none; font-weight:600;">
        Reset password
      </a>
    </p>
    <p style="color:#57534e; font-size:13px;">This link expires in {settings.RESET_TOKEN_EXPIRE_HOURS} hour(s).</p>
    <p style="color:#57534e; font-size:13px;">If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    <p>- LeaveOps HR</p>
  </body>
</html>
""",
        subtype="html",
    )
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)