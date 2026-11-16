"""Local preview server that resolves /impressum to impressum.html like GitHub Pages: serve.py <dir> <port>"""
import http.server, os, sys
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = super().translate_path(path)
        return p + '.html' if not os.path.exists(p) and os.path.exists(p + '.html') else p
    def log_message(self, *a): pass
os.chdir(sys.argv[1])
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), H).serve_forever()
