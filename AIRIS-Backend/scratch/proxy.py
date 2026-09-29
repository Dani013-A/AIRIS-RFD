import http.server
import socketserver
import urllib.request
import urllib.error
import ssl

TARGET = "https://18-143-33-249.sslip.io"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.proxy_request("GET")

    def do_POST(self):
        self.proxy_request("POST")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def proxy_request(self, method):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        url = f"{TARGET}{self.path}"
        print(f"[PROXY] {method} {self.path} -> {url} (body_len={len(body) if body else 0})", flush=True)

        req_headers = {}
        for k, v in self.headers.items():
            if k.lower() not in ("host", "content-length"):
                req_headers[k] = v

        req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                status = resp.status
                resp_headers = resp.headers
                resp_body = resp.read()
                print(f"[PROXY] Response {status} len={len(resp_body)}", flush=True)
                self.send_response(status)
                for hk, hv in resp_headers.items():
                    if hk.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                        self.send_header(hk, hv)
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            err_body = e.read()
            print(f"[PROXY] HTTPError {e.code}: {err_body.decode('utf-8', errors='ignore')}", flush=True)
            self.send_response(e.code)
            for hk, hv in e.headers.items():
                if hk.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                    self.send_header(hk, hv)
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            print(f"[PROXY] Error: {e}", flush=True)
            self.send_response(502)
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8000), ProxyHandler)
    print("Proxy running on http://0.0.0.0:8000 -> https://18-143-33-249.sslip.io", flush=True)
    server.serve_forever()
