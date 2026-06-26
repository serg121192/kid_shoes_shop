"""
Resend HTTP API email backend (no SMTP).

Railway and many PaaS providers block outbound SMTP ports 465/587.
Resend recommends their REST API: https://resend.com/docs/api-reference/emails/send-email
"""

import logging

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


class ResendEmailBackend(BaseEmailBackend):
    """Send email via Resend REST API using RESEND_API_KEY or EMAIL_HOST_PASSWORD."""

    def send_messages(self, email_messages):
        api_key = getattr(settings, "RESEND_API_KEY", "") or settings.EMAIL_HOST_PASSWORD
        if not api_key:
            logger.error("Resend API key missing (set RESEND_API_KEY or EMAIL_HOST_PASSWORD)")
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                if self._send_one(message, api_key):
                    sent_count += 1
            except Exception:
                if self.fail_silently:
                    logger.exception("Resend: failed to send %r", message.subject)
                else:
                    raise
        return sent_count

    def _send_one(self, message, api_key: str) -> bool:
        recipients = [addr for addr in message.to if addr]
        if not recipients:
            return False

        payload: dict = {
            "from": message.from_email or settings.DEFAULT_FROM_EMAIL,
            "to": recipients,
            "subject": message.subject,
        }

        html_body = None
        text_body = message.body or ""

        for content, mimetype in getattr(message, "alternatives", []):
            if mimetype == "text/html":
                html_body = content

        if html_body:
            payload["html"] = html_body
            if text_body:
                payload["text"] = text_body
        elif message.content_subtype == "html":
            payload["html"] = text_body
        elif text_body:
            payload["text"] = text_body

        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )

        if response.status_code >= 400:
            logger.error(
                "Resend API error %s: %s",
                response.status_code,
                response.text,
            )
            response.raise_for_status()

        data = response.json()
        logger.info(
            "Resend email sent: %s → %s (id=%s)",
            message.subject,
            ", ".join(recipients),
            data.get("id", "?"),
        )
        return True
