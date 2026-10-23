import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '127.0.0.1')
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() in ('true', '1')
    print(f"\n=======================================================")
    print(f" Instant Persona & Communication Transformer API")
    print(f" Running at: http://{host}:{port}/api/health")
    print(f"=======================================================\n")
    app.run(host=host, port=port, debug=debug)
