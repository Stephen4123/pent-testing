# Changes by Sheik

This file documents all the updates and modifications made to the project after pulling the branch.

## 1. Scan Termination and Restart
*   **Backend:** Fixed the `scan_id` parsing bug in `/api/scans/{scan_id}/terminate` in both `endpoints.py` and `admin.py` to ensure scans terminate correctly without database UUID mismatch errors.
*   **Frontend:** Added a red "Terminate Scan" button to the active scan progress page (`ReportDetails.jsx` and `ReportDetails.css`).
*   **Frontend:** Activated the "Restart Scan" (circular arrow) action icon on the `Scans.jsx` page for `TERMINATED` and `FAILED` scans, which launches a new scan for the same target URL.
*   **Frontend:** Removed the non-functional three-dot menu icon from the `Scans.jsx` page.

## 2. Dynamic Dashboard Widgets
*   **Backend:** Created a new endpoint `GET /api/scans/widgets` in `endpoints.py` to calculate real-time scanning capacity, 7-day critical finding trends, and dynamic AI recommendations based on actual database metrics.
*   **Frontend:** Updated `Scans.jsx` to fetch and display this dynamic data instead of relying on hardcoded static strings.

## 3. Subdomain Enumeration Bug Fix
*   **Backend:** Fixed a logging mismatch in `engine.py` where the live activity stream reported `0 subdomains` while the host assets mocked `1 subdomain`. The engine now properly logs the mocked fallback subdomain if the actual enumeration finds nothing.

## 4. Custom Findings Filter Dropdowns
*   **Frontend:** Replaced the default native browser `<select>` dropdowns in the Findings page (`ReportDetails.jsx`) with custom UI components that match the project's dark theme (smooth popovers, custom hover states).
*   **Frontend:** Added corresponding CSS classes (`.rd-custom-dropdown`, `.rd-custom-dropdown-menu`, etc.) to `ReportDetails.css`.

## 5. Admin Settings Implementation (In Progress)
*   **Backend:** Added a new `SystemSettings` database model in `models.py` to store global configuration like `max_concurrent_scans` and `max_requests_per_second`.

## 6. Environment & Port Configuration
*   **Backend:** Fixed port binding issues (`WinError 10013`) by migrating the FastAPI development server from port `8005` to `8085`.
*   **Frontend:** Updated all hardcoded API URLs across `frontend/src/**/*.jsx` files to target the backend on port `8085`.
*   **Frontend:** Reconfigured `vite.config.js` to serve the development UI on port `3000` (later reverted to Vite default).

## 7. Authentication & Login Bug Fixes
*   **Backend:** Discovered that the local SQLite database was uninitialized, which blocked logins. Executed `setup_admin.py` to seed the initial admin account (`admin` / `Admin@123`).
*   **Frontend:** Fixed a missing component rendering bug and restored accidentally wiped frontend files (`App.jsx`, `Settings.css`).
