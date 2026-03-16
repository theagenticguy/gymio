import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    ssl_cert = "/etc/letsencrypt/live/gymio.me/fullchain.pem"
    ssl_key = "/etc/letsencrypt/live/gymio.me/privkey.pem"

    kwargs = {
        "app": "server.api:app",
        "host": "0.0.0.0",
        "port": 5000,
        "reload": True,
    }

    # Only use SSL if certs exist (on the Pi)
    if os.path.exists(ssl_cert):
        kwargs["ssl_certfile"] = ssl_cert
        kwargs["ssl_keyfile"] = ssl_key

    uvicorn.run(**kwargs)
