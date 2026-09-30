from flask import Flask, request, send_file
import os

app = Flask(__name__)

@app.after_request
def add_security_headers(response):
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

@app.route('/')
def index():
    return """
    <h1>Directory Traversal Test App</h1>
    <p>This application is intentionally vulnerable to directory traversal.</p>
    <p>Try accessing: <a href="/download?file=test.txt">/download?file=test.txt</a></p>
    """

@app.route('/download', methods=['GET'])
def download():
    # VULNERABLE: No path sanitization
    file_name = request.args.get('file')
    if not file_name:
        return "Missing 'file' parameter. Example: /download?file=example.txt", 400
        
    try:
        # The file_name is passed directly to send_file, allowing ../../ patterns
        return send_file(file_name)
    except Exception as e:
        return f"Error reading file: {str(e)}", 404

if __name__ == '__main__':
    # Create a dummy text file for testing
    if not os.path.exists('test.txt'):
        with open('test.txt', 'w') as f:
            f.write('This is a test file to verify the download functionality.')
            
    print("Starting Directory Traversal Test Server on http://0.0.0.0:8081")
    app.run(host='0.0.0.0', port=8081, use_reloader=False)
