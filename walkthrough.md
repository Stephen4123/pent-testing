# Development Walkthrough: Backend scan orchestration and API integrations

This walkthrough details the changes made to complete the implementation plan, transition the scanner backend from mock simulations to functional audits, and connect report downloads to the React dashboard.

## 🛠️ Changes Implemented

### 1. Dependencies and Configuration
* Added `google-genai` to [requirements.txt](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/requirements.txt).
* Setup `GEMINI_API_KEY`, `OPENAI_API_KEY`, and default `LLM_PROVIDER` in [config.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/core/config.py) and created the `.env` configuration file.
* Fixed a Python import order error in [tech_detect.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/recon/tech_detect.py).

### 2. AI Intelligence Modules
* **[planner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/ai/planner.py) [NEW]**: Queries Google Gemini (`gemini-3.5-flash`) to generate a customized, prioritized scanning schedule based on target reconnaissance data (technologies, hostname, ports), with local rules as fallback.
* **[processing.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/ai/processing.py) [NEW]**: Uses Gemini to rewrite raw vulnerability details into clean, developer-friendly descriptions and remediation steps, including language-specific code snippets.

### 3. Active Discovery Scanners
* **[contract.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/contract.py) [NEW]**: Standardized Pydantic models for scanner output verification.
* **[ssl_scanner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/ssl_scanner.py) [NEW]**: Analyzes certificate expirations, self-signed status, and audits socket connections for deprecated TLS 1.0/1.1 protocols.
* **[api_scanner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/api_scanner.py) [NEW]**: Discovers exposed OpenAPI specifications (like `/openapi.json`), parses endpoints, and tests sensitive GET endpoints for missing authentication.
* **[nuclei_scanner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/nuclei_scanner.py) [NEW]**: Spawns a local `nuclei` process via Python subprocess, parses YAML template matching results, and yields findings.
* **[zap_scanner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/zap_scanner.py) [NEW]**: Hooks into a running OWASP ZAP API daemon to spider the webapp routes, launch active fuzzer scans, and download alert lists.

### 4. Validation and Risk Mapping
* **[deduplicator.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/validation/deduplicator.py) [NEW]**: Collapses duplicate vulnerability alerts from multiple scanners, merging their evidence payloads.
* **[verifier.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/validation/verifier.py) [NEW]**: Performs non-destructive verify probes (e.g. re-requesting headers) to reduce false positives.
* **[analyzer.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/risk/analyzer.py) [NEW]**: Dynamically computes normalized CVSS-like scores (0.0 - 10.0) based on severity and verification status.

### 5. Reporting Pipeline
* **[generator.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/reporting/generator.py) [NEW]**: Aggregates metadata, statistics, recon profiles, and findings lists into a JSON report.
* **[pdf_generator.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/reporting/pdf_generator.py) [NEW]**: Uses `reportlab` to render a styled, multi-page security report PDF containing metadata blocks, severity breakdown tables, and technical evidence blocks.
* **Orchestrator Integration**: Modified [engine.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/orchestrator/engine.py) to tie all stages together, saving JSON/PDF reports to the `backend/reports/` folder upon scan completion.

### 6. API and Frontend Connection
* **[endpoints.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/api/endpoints.py) [MODIFY]**: Added `/api/scans/{scan_id}/pdf` and `/api/scans/{scan_id}/json` report download routes.
* **[ReportDetails.jsx](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/frontend/src/pages/ReportDetails.jsx) [MODIFY]**: Connected the "Download PDF" and "JSON Export" buttons to open the backend download links in a new tab.
* **[Reports.jsx](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/frontend/src/pages/Reports.jsx) [MODIFY]**: Linked the PDF download button in the historical scans list to download the reports.

---

## 🧪 Verification and Testing

### 1. AI Integration Test
We ran [test_ai.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/test_ai.py) to test Gemini connection using the `gemini-3.5-flash` model. The AI successfully planned specific discovery stages and translated technical SQL Injection logs into detailed developer remediations.

### 2. FastAPI Pytest Suite
We wrote unit tests in [test_api.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/tests/test_api.py) checking health routes, dashboard metrics, and the scan launching database lifecycle.
* **Command executed**: `python -m pytest backend/tests/`
* **Result**: `3 passed, 5 warnings in 9.62s` (All test assertions passed successfully).
