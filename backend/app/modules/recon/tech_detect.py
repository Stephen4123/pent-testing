import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional

def detect_technologies(target_url: str, response: Optional[requests.Response] = None) -> List[str]:
    """
    Analyzes HTTP headers, cookie names, and DOM elements of the target page
    to discover active frameworks, libraries, web servers, and databases.
    """
    technologies = []
    
    # 1. Fetch page if response not provided
    if response is None:
        try:
            response = requests.get(target_url, timeout=5, headers={"User-Agent": "AutoSec-Scanner/1.0"})
        except requests.RequestException:
            return []

    headers = response.headers
    cookies = response.cookies
    html_content = response.text

    # 2. Server & Web Infrastructure Analysis (Headers)
    server_header = headers.get("Server", "").lower()
    if "nginx" in server_header:
        technologies.append("Nginx")
    elif "apache" in server_header:
        technologies.append("Apache")
    elif "cloudflare" in server_header:
        technologies.append("Cloudflare")
    elif "iis" in server_header:
        technologies.append("Microsoft IIS")
        
    powered_by = headers.get("X-Powered-By", "").lower()
    if "php" in powered_by:
        technologies.append("PHP")
    elif "express" in powered_by:
        technologies.append("NodeJS (Express)")
    elif "asp.net" in powered_by:
        technologies.append("ASP.NET")

    # 3. Session Cookie Analysis
    cookie_names = [cookie.name for cookie in cookies]
    for c_name in cookie_names:
        if c_name == "PHPSESSID":
            if "PHP" not in technologies:
                technologies.append("PHP")
        elif c_name == "JSESSIONID":
            technologies.append("Java/Spring Boot")
        elif c_name in ["connect.sid", "io"]:
            if "NodeJS (Express)" not in technologies:
                technologies.append("NodeJS (Express)")
        elif c_name == "django":
            technologies.append("Python (Django)")

    # 4. DOM Parsing (Libraries & Frontends)
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        
        # Meta generator check
        meta_gen = soup.find("meta", attrs={"name": "generator"})
        if meta_gen and meta_gen.get("content"):
            technologies.append(meta_gen.get("content"))
            
        # Inspect scripts for libraries (React, Angular, Vue, jQuery)
        scripts = soup.find_all("script")
        html_str = html_content.lower()
        
        has_jquery = False
        has_react = False
        has_vue = False
        
        for script in scripts:
            src = script.get("src", "").lower()
            if "jquery" in src:
                has_jquery = True
            if "react" in src or "react-dom" in src:
                has_react = True
            if "vue" in src:
                has_vue = True
                
        # DOM attribute indicator fallbacks
        if soup.find(id="root") or soup.find(id="app") or "data-reactroot" in html_str:
            has_react = True
        if "v-bind" in html_str or "v-if" in html_str:
            has_vue = True
        if "ng-version" in html_str or soup.find("app-root"):
            technologies.append("Angular")
            
        if has_jquery:
            technologies.append("jQuery")
        if has_react:
            technologies.append("React")
        if has_vue:
            technologies.append("Vue.js")
            
        # Juice Shop specific checks (since it doesn't always broadcast Express in headers)
        if "main.js" in html_str or "polyfills.js" in html_str:
            if "NodeJS (Express)" not in technologies:
                technologies.append("NodeJS (Express)")
            
    except Exception:
        pass

    return list(set(technologies))

