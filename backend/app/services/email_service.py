import smtplib
import ssl
import re
from email.message import EmailMessage
from typing import Dict, Any, List, Optional
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('email_service')

class EmailService:
    @staticmethod
    def test_smtp_connection(smtp_config: Dict[str, Any]) -> Dict[str, Any]:
        """Tests SMTP connection and authentication credentials."""
        server_host = smtp_config.get('server', '').strip()
        port = int(smtp_config.get('port', 587))
        username = smtp_config.get('username', '').strip()
        password = smtp_config.get('password', '')
        use_tls = smtp_config.get('use_tls', True)
        use_ssl = smtp_config.get('use_ssl', False)

        if not server_host:
            raise ValueError("SMTP Server host is required (e.g. smtp.gmail.com).")
        if not username:
            raise ValueError("SMTP Username / Email is required.")
        if not password:
            raise ValueError("SMTP Password / App Password is required.")

        context = ssl.create_default_context()

        try:
            if use_ssl or port == 465:
                server = smtplib.SMTP_SSL(server_host, port, timeout=12, context=context)
            else:
                server = smtplib.SMTP(server_host, port, timeout=12)
                if use_tls:
                    server.starttls(context=context)

            server.login(username, password)
            server.quit()
            return {
                "success": True,
                "message": f"Successfully connected and authenticated with {server_host}:{port} as {username}."
            }
        except smtplib.SMTPAuthenticationError as e:
            logger.warning(f"SMTP Auth error: {e}")
            raise RuntimeError(
                "SMTP Authentication failed. If using Gmail, ensure 2-Step Verification is ON "
                "and you are using a 16-character Google App Password (not your normal password)."
            )
        except smtplib.SMTPConnectError as e:
            logger.error(f"SMTP Connect error: {e}")
            raise RuntimeError(f"Could not connect to SMTP server {server_host}:{port}. Check host and port.")
        except Exception as e:
            logger.exception(f"SMTP generic error: {e}")
            raise RuntimeError(f"SMTP Connection error: {str(e)}")

    @staticmethod
    def send_email(
        to_email: str | List[str],
        subject: str,
        body: str,
        smtp_config: Dict[str, Any],
        sender_name: Optional[str] = "Persona Transformer"
    ) -> Dict[str, Any]:
        """Sends an email via SMTP."""
        server_host = smtp_config.get('server', 'smtp.gmail.com').strip()
        port = int(smtp_config.get('port', 587))
        username = smtp_config.get('username', '').strip()
        password = smtp_config.get('password', '')
        use_tls = smtp_config.get('use_tls', True)
        use_ssl = smtp_config.get('use_ssl', False)

        if not username or not password:
            raise ValueError("SMTP Username and App Password are required to send emails via Flask SMTP.")

        recipients = [to_email] if isinstance(to_email, str) else to_email
        recipients = [r.strip() for r in recipients if r and r.strip()]
        if not recipients:
            raise ValueError("At least one recipient email address is required.")

        msg = EmailMessage()
        msg['Subject'] = subject or "Transformed Communication"
        msg['From'] = f"{sender_name} <{username}>"
        msg['To'] = ", ".join(recipients)
        msg.set_content(body)

        context = ssl.create_default_context()

        try:
            if use_ssl or port == 465:
                server = smtplib.SMTP_SSL(server_host, port, timeout=15, context=context)
            else:
                server = smtplib.SMTP(server_host, port, timeout=15)
                if use_tls:
                    server.starttls(context=context)

            server.login(username, password)
            server.send_message(msg)
            server.quit()

            logger.info(f"Email dispatched successfully to {recipients}")
            return {
                "success": True,
                "recipients": recipients,
                "message": f"Email successfully dispatched to {len(recipients)} recipient(s) via {server_host}."
            }
        except smtplib.SMTPAuthenticationError as e:
            logger.warning(f"SMTP Auth error during send: {e}")
            raise RuntimeError(
                "SMTP Authentication failed. For Gmail, please use an App Password generated under Google Account Security."
            )
        except Exception as e:
            logger.exception(f"Failed to send email: {e}")
            raise RuntimeError(f"Email delivery failed: {str(e)}")


class VcfParser:
    @staticmethod
    def parse_vcf(vcf_text: str) -> List[Dict[str, Any]]:
        """Parses vCard / .vcf text and returns structured contact objects."""
        contacts = []
        if not vcf_text:
            return contacts

        # Split into cards
        cards = re.split(r'BEGIN:VCARD', vcf_text, flags=re.IGNORECASE)
        for idx, card in enumerate(cards):
            card = card.strip()
            if not card:
                continue

            lines = card.splitlines()
            unfolded_lines = []
            for line in lines:
                if line.startswith((' ', '\t')) and unfolded_lines:
                    unfolded_lines[-1] += line[1:]
                else:
                    unfolded_lines.append(line.strip())

            name = ""
            phones = []
            emails = []
            org = ""
            title = ""

            for line in unfolded_lines:
                if ':' not in line:
                    continue
                key_part, val = line.split(':', 1)
                key_part = key_part.strip()
                val = val.strip()
                if not val:
                    continue

                key_upper = key_part.upper().split(';')[0]

                if key_upper == 'FN':
                    name = val
                elif key_upper == 'N' and not name:
                    parts = [p.strip() for p in val.split(';') if p.strip()]
                    name = " ".join(reversed(parts)) if parts else val
                elif key_upper == 'TEL':
                    clean_phone = re.sub(r'[^\d+]', '', val)
                    if clean_phone and clean_phone not in phones:
                        phones.append(clean_phone)
                elif key_upper == 'EMAIL':
                    if '@' in val and val not in emails:
                        emails.append(val)
                elif key_upper == 'ORG':
                    org = val.replace(';', ' - ').strip()
                elif key_upper == 'TITLE':
                    title = val

            if name or phones or emails:
                display_name = name or (emails[0] if emails else (phones[0] if phones else f"Contact #{idx+1}"))
                contacts.append({
                    "id": idx + 1,
                    "name": display_name,
                    "phone": phones[0] if phones else "",
                    "all_phones": phones,
                    "email": emails[0] if emails else "",
                    "all_emails": emails,
                    "org": org,
                    "title": title
                })

        return contacts
