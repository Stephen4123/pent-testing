from flask import Flask, request, send_file, render_template, render_template_string, redirect, url_for
import sqlite3
import os

app = Flask(__name__)

# Initialize a dummy SQLite database
def init_db():
    conn = sqlite3.connect('vulnerable.db')
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, is_admin BOOLEAN)')
    c.execute('DELETE FROM users')
    c.execute("INSERT INTO users (username, password, is_admin) VALUES ('admin', 'supersecret', 1)")
    c.execute("INSERT INTO users (username, password, is_admin) VALUES ('john', 'password123', 0)")
    c.execute("INSERT INTO users (username, password, is_admin) VALUES ('jane', 'qwerty', 0)")
    conn.commit()
    conn.close()

# 1. Missing Security Headers
@app.after_request
def add_headers(response):
    # Ensure NO security headers are present for testing
    response.headers.pop('X-Frame-Options', None)
    response.headers.pop('Content-Security-Policy', None)
    response.headers.pop('Strict-Transport-Security', None)
    return response

@app.route('/')
def index():
    return render_template('index.html')

# 2. Exposed API Spec
@app.route('/api/openapi.json')
def serve_openapi():
    # Serve static OpenAPI spec to trigger API Spec Exposure finding
    return send_file('openapi.json', mimetype='application/json')

# 3. SQL Injection (Login)
@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = sqlite3.connect('vulnerable.db')
        c = conn.cursor()
        
        # DANGEROUS: String concatenation for authentication query
        try:
            query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
            print(f"Executing Query: {query}") # For debugging in logs
            c.execute(query)
            user = c.fetchone()
            conn.close()
            
            if user:
                # Vulnerable auth mechanism: Just setting a cookie without signature
                response = redirect(url_for('admin'))
                response.set_cookie('role', 'admin' if user[3] else 'user')
                return response
            else:
                error = "Invalid credentials."
        except Exception as e:
            conn.close()
            error = f"Database Error: {str(e)}"
            
    return render_template('login.html', error=error)

# 4. Cross-Site Scripting (XSS)
@app.route('/guestbook', methods=['GET'])
def guestbook():
    query = request.args.get('q')
    # The template renders `search_query | safe` which allows XSS
    return render_template('guestbook.html', search_query=query, request=request)

# 5. Broken Access Control / Auth Bypass
@app.route('/admin', methods=['GET'])
def admin():
    # Intentionally missing proper authentication checks.
    # It only checks if the cookie exists and equals 'admin', which is easily spoofed.
    # OR it just lets anyone in if they navigate directly!
    return render_template('admin.html')

# 6. Path Traversal
@app.route('/download', methods=['GET'])
def download():
    # DANGEROUS: No sanitization of file path
    file_name = request.args.get('file')
    if not file_name:
        return "Missing file parameter", 400
        
    try:
        # e.g., /download?file=../../../../etc/passwd
        return send_file(file_name)
    except Exception as e:
        return f"File not found: {file_name}", 404

# 7. Command Injection (RCE)
@app.route('/ping', methods=['GET'])
def ping():
    ip = request.args.get('ip', '127.0.0.1')
    # DANGEROUS: Command Injection vulnerability
    try:
        # e.g., /ping?ip=127.0.0.1 & whoami
        output = os.popen(f"ping -n 1 {ip}").read()
        return f"<pre>{output}</pre>"
    except Exception as e:
        return str(e)

if __name__ == '__main__':
    init_db()
    
    import threading

    def run_https():
        try:
            app.run(host='0.0.0.0', port=8443, ssl_context=('cert.pem', 'key.pem'), use_reloader=False)
        except Exception as e:
            print(f"HTTPS Server Error: {e}")

    def run_http():
        try:
            app.run(host='0.0.0.0', port=8080, use_reloader=False)
        except Exception as e:
            print(f"HTTP Server Error: {e}")

    # Start HTTPS in a background thread
    t1 = threading.Thread(target=run_https)
    t1.daemon = True
    t1.start()

    # Start HTTP in the main thread
    run_http()
