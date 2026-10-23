import os
import pytest
from backend.app import create_app
from backend.app.extensions import db
from backend.app.config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    OFFLINE_MODE = True
    MAX_INPUT_CHARS = 2500
    MAX_INPUT_WORDS = 500

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()
