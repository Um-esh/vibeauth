from flask import Blueprint, request
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional, Dict, Any, Union
from backend.app.services.email_service import EmailService, VcfParser
from backend.app.schemas.responses import success_response, error_response
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('dispatch_api')
dispatch_bp = Blueprint('dispatch_bp', __name__)

class SmtpConfigModel(BaseModel):
    server: str = "smtp.gmail.com"
    port: int = 587
    username: str
    password: str
    use_tls: bool = True
    use_ssl: bool = False

class TestSmtpRequest(BaseModel):
    smtp_config: SmtpConfigModel

class SendEmailRequest(BaseModel):
    to_email: Union[str, List[str]]
    subject: str = "Transformed Communication"
    body: str
    smtp_config: Optional[SmtpConfigModel] = None
    access_token: Optional[str] = None

class ParseVcfRequest(BaseModel):
    vcf_content: str

@dispatch_bp.route('/email/test-smtp', methods=['POST'])
def test_smtp():
    """Validates SMTP credentials and tests connection."""
    data = request.get_json(silent=True)
    if not data:
        return error_response("Malformed JSON request body.", status_code=400)

    try:
        req = TestSmtpRequest(**data)
    except ValidationError as e:
        clean_errors = [
            {'field': '.'.join(str(x) for x in err.get('loc', [])), 'message': err.get('msg', 'Invalid input')}
            for err in e.errors()
        ]
        return error_response("Validation error", details=clean_errors, status_code=422)

    try:
        result = EmailService.test_smtp_connection(req.smtp_config.model_dump())
        return success_response(result)
    except (ValueError, RuntimeError) as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.exception(f"Unexpected error testing SMTP: {e}")
        return error_response(f"SMTP Error: {str(e)}", status_code=500)

@dispatch_bp.route('/email/send', methods=['POST'])
def send_email():
    """Dispatches email using Flask SMTP with custom or configured credentials."""
    data = request.get_json(silent=True)
    if not data:
        return error_response("Malformed JSON request body.", status_code=400)

    try:
        req = SendEmailRequest(**data)
    except ValidationError as e:
        clean_errors = [
            {'field': '.'.join(str(x) for x in err.get('loc', [])), 'message': err.get('msg', 'Invalid input')}
            for err in e.errors()
        ]
        return error_response("Validation error", details=clean_errors, status_code=422)

    try:
        if req.access_token:
            result = EmailService.send_via_gmail_api(
                access_token=req.access_token,
                to_email=req.to_email,
                subject=req.subject,
                body=req.body
            )
        elif req.smtp_config:
            result = EmailService.send_email(
                to_email=req.to_email,
                subject=req.subject,
                body=req.body,
                smtp_config=req.smtp_config.model_dump()
            )
        else:
            return error_response("Either smtp_config or access_token must be provided to send email.", status_code=400)

        return success_response(result)
    except (ValueError, RuntimeError) as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.exception(f"Unexpected error sending email: {e}")
        return error_response(f"Email send error: {str(e)}", status_code=500)

@dispatch_bp.route('/contacts/parse-vcf', methods=['POST'])
def parse_vcf_endpoint():
    """Parses uploaded .vcf text or file and returns contacts."""
    vcf_text = ""

    # Check for multipart file upload
    if 'file' in request.files:
        uploaded_file = request.files['file']
        try:
            vcf_text = uploaded_file.read().decode('utf-8', errors='ignore')
        except Exception as e:
            return error_response(f"Could not read uploaded VCF file: {e}", status_code=400)
    else:
        # Check for JSON payload
        data = request.get_json(silent=True)
        if data and 'vcf_content' in data:
            vcf_text = data['vcf_content']

    if not vcf_text.strip():
        return error_response("No VCF content provided. Upload a .vcf file or provide vcf_content in JSON.", status_code=400)

    contacts = VcfParser.parse_vcf(vcf_text)
    return success_response({
        "contacts": contacts,
        "count": len(contacts)
    })
