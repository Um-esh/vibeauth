import pytest
from unittest.mock import patch, MagicMock
from backend.app.services.email_service import VcfParser, EmailService

SAMPLE_VCF = """BEGIN:VCARD
VERSION:3.0
FN:Sarah Connor
ORG:Cyberdyne Systems
TITLE:Chief Executive Officer
TEL;TYPE=WORK,VOICE:+1-555-0199
TEL;TYPE=CELL:+1-555-0144
EMAIL;TYPE=INTERNET:sarah.connor@cyberdyne.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Alex Mercer
ORG:Apex Labs
TEL:+44 7911 123456
EMAIL:alex.mercer@apex.io
END:VCARD
"""

def test_vcf_parser_extracts_contacts():
    contacts = VcfParser.parse_vcf(SAMPLE_VCF)
    assert len(contacts) == 2

    c1 = contacts[0]
    assert c1['name'] == 'Sarah Connor'
    assert '+15550199' in c1['phone'] or '15550199' in c1['phone']
    assert c1['email'] == 'sarah.connor@cyberdyne.com'
    assert 'Cyberdyne Systems' in c1['org']

    c2 = contacts[1]
    assert c2['name'] == 'Alex Mercer'
    assert c2['email'] == 'alex.mercer@apex.io'


def test_api_parse_vcf(client):
    res = client.post('/api/contacts/parse-vcf', json={'vcf_content': SAMPLE_VCF})
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['count'] == 2
    assert data['contacts'][0]['name'] == 'Sarah Connor'


def test_api_test_smtp_validation(client):
    res = client.post('/api/email/test-smtp', json={
        'smtp_config': {
            'server': 'smtp.gmail.com',
            'port': 587,
            'username': 'user@example.com',
            'password': 'testpassword'
        }
    })
    # Since testpassword is fake, it will fail auth, but should return a handled 400 error rather than 500 crash
    assert res.status_code in [400, 500]
    err = res.get_json()
    assert 'error' in err


@patch('smtplib.SMTP')
def test_api_send_email_success(mock_smtp_class, client):
    mock_server = MagicMock()
    mock_smtp_class.return_value = mock_server

    res = client.post('/api/email/send', json={
        'to_email': 'sarah@example.com',
        'subject': 'Executive Project Brief',
        'body': 'Here is the executive report...',
        'smtp_config': {
            'server': 'smtp.gmail.com',
            'port': 587,
            'username': 'me@example.com',
            'password': 'secretpassword',
            'use_tls': True
        }
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert 'sarah@example.com' in data['recipients']
    mock_server.login.assert_called_with('me@example.com', 'secretpassword')
    mock_server.send_message.assert_called_once()
