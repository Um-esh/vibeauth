from flask import Flask
from flask_cors import CORS
from backend.app.config import Config
from backend.app.extensions import db
from backend.app.api.health import health_bp
from backend.app.api.rewrite import rewrite_bp
from backend.app.api.history import history_bp
from backend.app.api.dispatch import dispatch_bp
from backend.app.schemas.responses import error_response
from backend.app.utils.logging_config import setup_logger

logger = setup_logger('app_factory')

def create_app(config_class=Config) -> Flask:
    """Application factory for the Flask backend."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}},
        supports_credentials=True
    )

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(rewrite_bp, url_prefix='/api')
    app.register_blueprint(history_bp, url_prefix='/api')
    app.register_blueprint(dispatch_bp, url_prefix='/api')

    # Register standard error handlers
    @app.errorhandler(404)
    def not_found(e):
        return error_response("Endpoint or resource not found.", status_code=404)

    @app.errorhandler(405)
    def method_not_allowed(e):
        return error_response("Method not allowed for this endpoint.", status_code=405)

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Uncaught server exception: {e}")
        return error_response("Internal server error.", status_code=500)

    # Create tables if they do not exist
    with app.app_context():
        import backend.app.models  # noqa
        db.create_all()
        logger.info("Database tables initialized.")

    logger.info("Flask application initialized successfully.")
    return app
