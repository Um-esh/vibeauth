import os
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')

    print("\n" + "=" * 60)
    print(" INSTANT PERSONA TRANSFORMER - PRODUCTION SERVER")
    print(f" Unified React Frontend + Flask ML Backend")
    print(f" Serving at: http://{host if host != '0.0.0.0' else 'localhost'}:{port}")
    print("=" * 60 + "\n")

    try:
        from waitress import serve
        print("Starting with Waitress WSGI production server...")
        serve(app, host=host, port=port, threads=4)
    except ImportError:
        print("Waitress not found, falling back to standard server...")
        app.run(host=host, port=port)
