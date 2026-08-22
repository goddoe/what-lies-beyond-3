#!/usr/bin/env python3
"""Static dev server with no-cache headers (browser always revalidates)."""
import http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('', 8734), NoCacheHandler).serve_forever()
