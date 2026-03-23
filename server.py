from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


def main() -> None:
    address = ("127.0.0.1", 8000)
    print("Serving Arrakis Spice Harvest on http://127.0.0.1:8000")
    ThreadingHTTPServer(address, SimpleHTTPRequestHandler).serve_forever()


if __name__ == "__main__":
    main()
