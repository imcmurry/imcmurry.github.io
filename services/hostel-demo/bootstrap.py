"""Provision the pinned private bundle once, then replace this server with inference.

The temporary upload route never exists while the model API is running.
Railway's persistent /data volume retains artifacts across sleeps and deploys.
"""
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import secrets
import tempfile
import threading
import zipfile

BUNDLE_SHA256 = "2b645793c2030b9e118660cfe11489222adfbbe7bb48994bac8904b6d4380d97"
BUNDLE_BYTES = 153512328
MAX_UNPACKED_BYTES = 400 * 1024 * 1024


def install_bundle(archive, destination, expected_sha=BUNDLE_SHA256):
    """Verify the complete archive before extracting any executable model objects."""
    with open(archive, "rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != expected_sha:
            raise ValueError("Bundle checksum mismatch")
    destination = Path(destination)
    with tempfile.TemporaryDirectory(dir=destination.parent, prefix="unpack-") as tmp:
        stage = Path(tmp)
        with zipfile.ZipFile(archive) as bundle:
            if sum(info.file_size for info in bundle.infolist()) > MAX_UNPACKED_BYTES:
                raise ValueError("Bundle too large")
            for info in bundle.infolist():
                name = PurePosixPath(info.filename)
                if name.is_absolute() or ".." in name.parts or "\\" in info.filename:
                    raise ValueError("Invalid bundle path")
                if not name.parts or name.parts[0] != "artifacts":
                    continue
                target = stage.joinpath(*name.parts)
                if info.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with bundle.open(info) as source, target.open("xb") as output:
                        shutil.copyfileobj(source, output)
        manifest = json.loads((stage / "artifacts/manifest.json").read_text())
        if manifest["version"] != "9a89cc3b81b92996":
            raise ValueError("Unexpected model version")
        (stage / "artifacts").rename(destination)


def provision(data_dir, token, port):
    if len(token) < 40:
        raise RuntimeError("Set a strong MODEL_UPLOAD_TOKEN before initial provisioning")
    completed = threading.Event()
    upload_lock = threading.Lock()
    upload_path = "/bootstrap/" + hashlib.sha256(token.encode()).hexdigest()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def reply(self, code, payload):
            body = json.dumps(payload).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if hmac.compare_digest(self.path.encode(), upload_path.encode()):
                nonce = secrets.token_urlsafe(24)
                body = ('''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install hostel model</title><body><h1>Install hostel model</h1>
<p>Upload the prepared hostel-demo-artifacts.zip to this private service.
The exact file checksum is verified before installation. This page closes after installation.</p>
<form><label for="bundle">Prepared model bundle</label>
<input id="bundle" type="file" accept=".zip" required>
<button type="submit">Install model</button></form><p role="status"></p>
<script nonce="''' + nonce + '''">
document.querySelector('form').addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('[role=status]');
  const button = document.querySelector('button');
  button.disabled = true;
  status.textContent = 'Uploading and verifying model files…';
  try {
    const response = await fetch(location.pathname, {method: 'POST',
      body: document.querySelector('input').files[0], credentials: 'omit'});
    if (!response.ok) throw new Error('Installation failed. Check the bundle and retry.');
    status.textContent = 'Model installed. The inference service is starting.';
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});
</script></body></html>''').encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("Referrer-Policy", "no-referrer")
                self.send_header("Content-Security-Policy", f"default-src 'none'; script-src 'nonce-{nonce}'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
                self.end_headers()
                self.wfile.write(body)
                return
            self.reply(200 if self.path == "/healthz" else 503, {"status": "awaiting_artifacts"})

        def do_POST(self):
            authorized = hmac.compare_digest(self.path.encode(), upload_path.encode()) or (
                self.path == "/bootstrap/artifacts" and hmac.compare_digest(
                    self.headers.get("Authorization", "").encode(), f"Bearer {token}".encode()))
            if not authorized:
                self.reply(404, {"error": "Not found"})
                return
            if self.headers.get("Content-Length") != str(BUNDLE_BYTES) or self.headers.get("Transfer-Encoding"):
                self.reply(413, {"error": "Unexpected bundle size"})
                return
            if completed.is_set() or not upload_lock.acquire(blocking=False):
                self.reply(409, {"error": "Upload already accepted"})
                return
            try:
                self.connection.settimeout(180)
                with tempfile.NamedTemporaryFile(dir=data_dir, suffix=".zip") as archive:
                    remaining = BUNDLE_BYTES
                    while remaining:
                        chunk = self.rfile.read(min(1024 * 1024, remaining))
                        if not chunk:
                            raise ValueError("Incomplete upload")
                        archive.write(chunk)
                        remaining -= len(chunk)
                    archive.flush()
                    install_bundle(archive.name, data_dir / "artifacts")
                completed.set()
                self.reply(201, {"status": "installed"})
            except Exception:
                self.reply(400, {"error": "Bundle installation failed"})
            finally:
                upload_lock.release()

    with ThreadingHTTPServer(("0.0.0.0", port), Handler) as server:
        server.timeout = 1
        while not completed.is_set():
            server.handle_request()


def main():
    data_dir = Path(os.getenv("ARTIFACT_DIR", "/data/artifacts")).parent
    data_dir.mkdir(parents=True, exist_ok=True)
    if os.getuid() == 0:
        import pwd
        user = pwd.getpwnam("demo")
        os.chown(data_dir, user.pw_uid, user.pw_gid)
        os.setgroups([])
        os.setgid(user.pw_gid)
        os.setuid(user.pw_uid)
    os.umask(0o077)
    port = int(os.getenv("PORT", "8080"))
    if not (data_dir / "artifacts/manifest.json").is_file():
        provision(data_dir, os.environ.get("MODEL_UPLOAD_TOKEN", ""), port)
    os.environ.pop("MODEL_UPLOAD_TOKEN", None)
    os.execvp("uvicorn", ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", str(port),
                          "--workers", "1", "--no-access-log", "--no-proxy-headers"])


if __name__ == "__main__":
    main()
