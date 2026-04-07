import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Load templates from backend/app/templates/emails/
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "emails"
jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=True,
)


class EmailService:
    """Async email service for sending analysis completion notifications."""

    async def send_analysis_complete(
        self,
        *,
        user_email: str,
        user_name: str,
        analysis_id: int,
        analysis_title: str,
        total_risk_score: float,
        threat_count: int,
        risk_level: str,
        critical_count: int = 0,
        high_count: int = 0,
        medium_count: int = 0,
        low_count: int = 0,
    ) -> None:
        if not settings.email_notifications_enabled:
            logger.debug("Email notifications disabled, skipping")
            return

        if not settings.smtp_host:
            logger.warning("SMTP host not configured, skipping email notification")
            return

        try:
            import aiosmtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            # Render email template
            template = jinja_env.get_template("analysis_complete.html")
            analysis_url = f"{settings.frontend_url}/analysis/{analysis_id}"
            html_body = template.render(
                user_name=user_name,
                analysis_title=analysis_title,
                analysis_id=analysis_id,
                analysis_url=analysis_url,
                total_risk_score=f"{total_risk_score:.1f}",
                threat_count=threat_count,
                risk_level=risk_level,
                critical_count=critical_count,
                high_count=high_count,
                medium_count=medium_count,
                low_count=low_count,
                app_name=settings.app_name,
            )

            # Build message
            message = MIMEMultipart("alternative")
            message["From"] = settings.smtp_from_email
            message["To"] = user_email
            message["Subject"] = f"TARA Analysis Complete: {analysis_title}"
            message.attach(
                MIMEText(
                    f"Your threat analysis '{analysis_title}' is complete. "
                    f"Found {threat_count} threats with overall risk score {total_risk_score:.1f}. "
                    f"View at: {analysis_url}",
                    "plain",
                )
            )
            message.attach(MIMEText(html_body, "html"))

            # Send
            await aiosmtplib.send(
                message,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user or None,
                password=settings.smtp_password or None,
                use_tls=settings.smtp_use_tls,
                timeout=15,
            )

            logger.info(
                "Analysis complete email sent to=%s analysis_id=%s",
                user_email,
                analysis_id,
            )

        except ImportError:
            logger.error("aiosmtplib not installed, cannot send emails")
        except Exception:
            logger.exception(
                "Failed to send analysis complete email to=%s analysis_id=%s",
                user_email,
                analysis_id,
            )


email_service = EmailService()
