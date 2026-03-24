import os
import socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


def main() -> None:
    host = os.environ.get("APP_HOST", "0.0.0.0")
    port = int(os.environ.get("APP_PORT", "8000"))
    address = (host, port)

    print(f"Serving Amber Dunes Harvest on http://{host}:{port}")

    lan_addresses = sorted(
        {
            info[4][0]
            for info in socket.getaddrinfo(socket.gethostname(), None, family=socket.AF_INET)
            if not info[4][0].startswith("127.")
        }
    )
    for lan_address in lan_addresses:
        print(f"LAN access: http://{lan_address}:{port}")

    ThreadingHTTPServer(address, SimpleHTTPRequestHandler).serve_forever()


if __name__ == "__main__":
    main()
