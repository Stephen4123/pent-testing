import json
from typing import List, Dict, Any
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


def get_default_plan(technologies: List[str], hostname: str) -> List[Dict[str, str]]:
    """
    Fallback method to generate a standard scan plan when LLM is unavailable or keys are missing.
    """
    plan = [
        {
            "scanner": "ssl_scanner",
            "description": f"Verify SSL certificate expiration, strength, and protocol versions for {hostname}."
        },
        {
            "scanner": "nuclei_scanner",
            "description": f"Run active CVE exposure checks matching technology profile: {', '.join(technologies)}."
        }
    ]
    
    # If API technologies are detected, prioritize API checks
    if any(tech.lower() in ["express", "node", "django", "fastapi", "spring", "api"] for tech in technologies):
        plan.append({
            "scanner": "api_scanner",
            "description": "Probe and audit OpenAPI/Swagger definitions and scan unauthenticated endpoint routes."
        })
        
    # If a full active scanner like ZAP is available
    if settings.ZAP_API_URL:
        plan.append({
            "scanner": "zap_scanner",
            "description": "Perform dynamic application security testing (DAST) spidering and active vulnerability checks."
        })
        
    return plan


def generate_scan_plan(technologies: List[str], hostname: str, dns_records: Dict[str, List[str]]) -> List[Dict[str, str]]:
    """
    Queries Gemini (or OpenAI fallback) to formulate a customized, intelligent penetration testing plan
    based on identified technologies, host configurations, and DNS properties.
    """
    # 1. Fallback immediately if LLM setup is not complete or no keys provided
    api_key = settings.GEMINI_API_KEY or settings.LLM_API_KEY
    openai_key = settings.OPENAI_API_KEY or settings.LLM_API_KEY

    use_gemini = settings.LLM_PROVIDER == "gemini" and api_key and GEMINI_AVAILABLE
    use_openai = settings.LLM_PROVIDER == "openai" and openai_key and OPENAI_AVAILABLE

    if not (use_gemini or use_openai):
        return get_default_plan(technologies, hostname)

    # 2. Build the system prompt
    recon_summary = {
        "hostname": hostname,
        "detected_technologies": technologies,
        "dns_records": {k: v for k, v in dns_records.items() if v}
    }

    prompt = f"""
    You are an expert autonomous web application penetration testing AI.
    Your task is to analyze the target reconnaissance data and create a customized, prioritized scanning schedule.
    
    Target Reconnaissance Summary:
    {json.dumps(recon_summary, indent=2)}
    
    Available Scanners in the system:
    - ssl_scanner: Audits TLS/SSL cipher suites, certificates, and deprecations. Only useful for HTTPS targets.
    - api_scanner: Audits OpenAPI specifications (/openapi.json, /swagger.json) and probes for auth-less REST endpoints.
    - nuclei_scanner: Runs fast vulnerability checks and CVE signature matching using Nuclei templates.
    - zap_scanner: Runs comprehensive OWASP ZAP spidering and active application security scanning.
    
    Instructions:
    Select which of the available scanners should run, and write a specific description explaining exactly why this scanner is selected based on the technologies detected.
    
    You MUST return your output strictly in JSON format matching the schema below. No other text, no markdown wrappers, just raw JSON:
    [
      {{
        "scanner": "scanner_name",
        "description": "Custom justification for why this scanner is needed for the target."
      }}
    ]
    """

    # 3. Call the configured LLM API
    try:
        if use_gemini:
            # Initialize official Google GenAI SDK client
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
            # Fallback to OpenAI SDK
            client = openai.OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a professional security penetration planner."},
                    {"role": "user", "content": prompt}
                ]
            )
            text_response = completion.choices[0].message.content

        # Clean markdown output blocks if returned
        text_response = text_response.strip()
        if text_response.startswith("```json"):
            text_response = text_response.split("```json")[1].split("```")[0].strip()
        elif text_response.startswith("```"):
            text_response = text_response.split("```")[1].split("```")[0].strip()

        parsed_plan = json.loads(text_response)
        
        # If model returns an object with a key, try to extract the list
        if isinstance(parsed_plan, dict):
            for val in parsed_plan.values():
                if isinstance(val, list):
                    return val
            return get_default_plan(technologies, hostname)
            
        if isinstance(parsed_plan, list):
            return parsed_plan

    except Exception as e:
        print(f"LLM planner failed: {e}. Falling back to default plan.")
        
    return get_default_plan(technologies, hostname)
