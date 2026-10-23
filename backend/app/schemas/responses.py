from typing import Any, Dict, Optional
from flask import jsonify, Response

def success_response(data: Any, message: Optional[str] = None, status_code: int = 200) -> Response:
    payload = {
        'status': 'success',
        'data': data
    }
    if message:
        payload['message'] = message
    return jsonify(payload), status_code

def error_response(message: str, details: Optional[Any] = None, status_code: int = 400) -> Response:
    payload = {
        'status': 'error',
        'error': message
    }
    if details:
        payload['details'] = details
    return jsonify(payload), status_code
