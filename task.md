# Remaining Tasks

- [x] Core Setup & Quick Fixes
  - [x] Fix the `Optional` import bug in [tech_detect.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/recon/tech_detect.py)
  - [x] Add `google-genai` to [requirements.txt](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/requirements.txt)
  - [x] Extend settings in [config.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/core/config.py) for the Gemini API key

- [x] AI Modules
  - [x] Create AI Target Planner in [planner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/ai/planner.py)
  - [x] Create AI Report Processor & Remediation Writer in [processing.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/ai/processing.py)

- [x] Active Discovery Scanners
  - [x] Create Unified Pydantic Contracts in [contract.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/contract.py)
  - [x] Create SSL Certificate & Cipher Inspector in [ssl_scanner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/ssl_scanner.py)
  - [x] Create OpenAPI Spec Auditor in [api_scanner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/api_scanner.py)
  - [x] Create Nuclei Scan subprocess wrapper in [nuclei_scanner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/nuclei_scanner.py)
  - [x] Create OWASP ZAP API integration wrapper in [zap_scanner.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/discovery/zap_scanner.py)

- [x] Validation & Risk Scoring
  - [x] Create Scan Findings Deduplicator in [deduplicator.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/validation/deduplicator.py)
  - [x] Create Vulnerability Verification double-check rules in [verifier.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/validation/verifier.py)
  - [x] Create Risk & CVSS Score Analyzer in [analyzer.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/risk/analyzer.py)

- [x] Reporting
  - [x] Create Unified JSON Report Builder in [generator.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/reporting/generator.py)
  - [x] Create PDF Report Renderer using `reportlab` in [pdf_generator.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/modules/reporting/pdf_generator.py)

- [x] Orchestration & Testing
  - [x] Integrate actual scanning pipeline in [engine.py](file:///c:/Users/IJMAMUL%20HUK%20ANSARI/Pentest2/Pentest2/backend/app/orchestrator/engine.py)
  - [x] Write backend unit tests and run verification checks
