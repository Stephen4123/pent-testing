import json
from typing import Dict, Any, Optional
from app.core.config import settings

# Attempt importing LLM libraries
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


def get_static_remediation(title: str, severity: str) -> Dict[str, str]:
    """
    Fallback method to provide standard, high-quality remediations and descriptions
    for common vulnerabilities if LLM is unavailable.
    """
    t_lower = title.lower()
    
    if "sql" in t_lower:
        return {
            "description": "SQL Injection occurs when untrusted input is directly concatenated into SQL query strings. An attacker can manipulate queries to extract data, modify tables, or execute database administrative operations.",
            "remediation": "1. Use Parameterized Queries: Replace dynamic SQL strings with prepared statements or ORM binding methods (e.g., SQLAlchemy parameters).\n2. Apply Input Validation: Use schema validation (like Pydantic) to verify that parameters match expected formats.\n3. Principle of Least Privilege: Ensure the database user has minimal necessary permissions.",
            "severity": severity
        }
    elif "xss" in t_lower or "cross-site scripting" in t_lower:
        return {
            "description": "Cross-Site Scripting (XSS) occurs when an application includes untrusted data in a web page without proper validation or escaping, allowing script execution in the context of the user's browser session.",
            "remediation": "1. Context-Aware Output Encoding: Escape all user-supplied data before inserting it into the DOM.\n2. Enable Content-Security-Policy (CSP): Restrict script execution sources.\n3. Use modern frontend frameworks: Frameworks like React and Vue automatically encode strings inserted in templates.",
            "severity": severity
        }
    elif "header" in t_lower or "csp" in t_lower or "hsts" in t_lower:
        return {
            "description": f"The target response is missing or has configured a weak security policy for the HTTP header. This increases exposure to attacks like clickjacking, XSS, or protocol downgrades.",
            "remediation": "1. Configure your Web Server: Add secure header rules in your reverse proxy (e.g. Nginx, Apache) or framework middleware.\n2. Example Nginx setting:\n   add_header Content-Security-Policy \"default-src 'self';\";\n   add_header Strict-Transport-Security \"max-age=63072000; includeSubDomains\" always;",
            "severity": severity
        }
    elif "ssl" in t_lower or "cipher" in t_lower or "tls" in t_lower:
        return {
            "description": "The server supports weak SSL/TLS protocols or insecure cipher suites. This leaves connections vulnerable to decryption or eavesdropping (e.g. POODLE, BEAST, or SWEET32 attacks).",
            "remediation": "1. Disable Old Protocols: Explicitly disable SSLv3, TLS 1.0, and TLS 1.1 on your reverse proxy or load balancer.\n2. Enforce Strong Ciphers: Update your cipher list to exclude RC4, 3DES, or null ciphers, and prioritize AES-GCM or CHACHA20.",
            "severity": severity
        }
        
    return {
        "description": "A potential security finding has been reported by active discovery scanners. This finding should be verified to confirm its impact.",
        "remediation": "Review the scanner evidence and inspect code areas handling these inputs or configurations. Implement standard input filtering and access control safeguards.",
        "severity": severity
    }


def enrich_finding_with_ai(finding: Dict[str, Any]) -> Dict[str, Any]:
    """
    Leverages Gemini (or OpenAI) to rewrite the scanner findings into a developer-friendly report.
    Adds simple explanations, business impact analysis, and specific remediation scripts.
    """
    title = finding.get("title", "")
    description = finding.get("description", "")
    severity = finding.get("severity", "MEDIUM")
    cve_id = finding.get("cve_id", "N/A")
    evidence = finding.get("evidence", {})
    scanner = finding.get("source_scanner", "Unknown")

    api_key = settings.GEMINI_API_KEY or settings.LLM_API_KEY
    openai_key = settings.OPENAI_API_KEY or settings.LLM_API_KEY

    use_gemini = settings.LLM_PROVIDER == "gemini" and api_key and GEMINI_AVAILABLE
    use_openai = settings.LLM_PROVIDER == "openai" and openai_key and OPENAI_AVAILABLE

    # 1. Immediate Fallback
    if not (use_gemini or use_openai):
        fallback = get_static_remediation(title, severity)
        return {
            "description": fallback["description"],
            "remediation": fallback["remediation"],
            "severity": fallback["severity"]
        }

    # 2. Build the reasoning prompt
    prompt = f"""
    You are an expert application security engineer conducting a code review and risk analysis.
    Review the following raw vulnerability scanner finding and enrich it to make it professional and developer-friendly.
    
    Raw Finding Data:
    - Title: {title}
    - Scanner: {scanner}
    - Initial Severity: {severity}
    - CVE ID: {cve_id}
    - Raw Description: {description}
    - Evidence Context: {json.dumps(evidence, indent=2)}
    
    Instructions:
    1. Write a clear, simple-english Description explaining how this vulnerability works, how it was detected, and its impact.
    2. Write a detailed, step-by-step Remediation section for developers, including coding best practices or server configuration snippets.
    3. Evaluate if the initial severity (CRITICAL, HIGH, MEDIUM, LOW, INFO) is correct or needs adjustments based on the evidence.
    
    You MUST respond strictly in JSON format matching the schema below. No other text, no markdown wrappers:
    {{
      "description": "Simplified description of the issue.",
      "remediation": "Numbered step-by-step guide with code/config examples.",
      "severity": "CRITICAL/HIGH/MEDIUM/LOW/INFO"
    }}
    """

    # 3. Request LLM completion
    try:
        if use_gemini:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            text_response = response.text
        elif use_openai:
            client = openai.OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a professional application security officer."},
                    {"role": "user", "content": prompt}
                ]
            )
            text_response = completion.choices[0].message.content

        # Clean wrappers
        text_response = text_response.strip()
        if text_response.startswith("```json"):
            text_response = text_response.split("```json")[1].split("```")[0].strip()
        elif text_response.startswith("```"):
            text_response = text_response.split("```")[1].split("```")[0].strip()

        parsed = json.loads(text_response)
        
        # Verify keys exist
        if "description" in parsed and "remediation" in parsed:
            # Map severity cleanly to matching string case
            res_sev = parsed.get("severity", severity).upper()
            if res_sev not in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
                res_sev = severity
            return {
                "description": parsed["description"],
                "remediation": parsed["remediation"],
                "severity": res_sev
            }

    except Exception as e:
        print(f"LLM findings enrichment failed: {e}. Falling back to rule-based remediation.")

    # Fallback if parsing fails or LLM error
    fallback = get_static_remediation(title, severity)
    return {
        "description": fallback["description"],
        "remediation": fallback["remediation"],
        "severity": fallback["severity"]
    }
