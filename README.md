# kakasfinance

A secure owner portal for managing Axis Bank Corporate Payout APIs — built for designated application owners to configure, test and monitor live payout operations from a single dashboard.

---

## What this project does

kakasfinance is a private web portal that gives authorised application owners direct access to Axis Bank's Corporate Payout API suite. It eliminates the need to write manual API scripts or use generic tools like Postman for routine payout operations. Instead, everything is available through a clean, secured interface that is purpose-built for corporate finance workflows.

The portal covers five core payout operations:

- **Salary Payment** — initiate bulk or individual salary disbursements to employee bank accounts
- **Transaction Status** — query the real-time status of any payout using a transaction reference or UTR number
- **Transfer Payment** — send funds via IMPS, NEFT or RTGS to any Indian bank account
- **Account Validation** — verify a beneficiary's account holder name before initiating any payment, using penny-drop or name-match methods
- **Fetch VPA** — resolve and validate a UPI Virtual Payment Address before a transfer

---

## How it works

The portal is a static single-page application. When an owner logs in with their credentials, the dashboard loads a live API test console for each of the five payout modules.

Each module has three sections:

- **Params** — input fields for all required and optional API parameters including the OAuth Bearer token, Client ID, IBM Client ID, account numbers and HMAC key
- **Headers** — editable request headers that are sent with every call
- **Body** — a pre-filled, editable JSON payload that maps directly to the Axis Bank API contract

When the owner clicks Send Request, the console fires an HTTP request directly to Axis Bank's API Connect gateway at `apiconnect.axisbank.co.in`. The raw JSON response appears immediately in the response panel alongside the HTTP status code and response time.

If no Bearer token is provided, the console returns a sandbox mock response so the owner can safely test the interface and verify request shapes without touching live accounts.

All API calls require a valid OAuth 2.0 Bearer token obtained from Axis Bank's API Connect portal using the owner's `Client ID` and `Client Secret`. The HMAC checksum required by Axis Bank is computed automatically on every payout request.

The portal also maintains a session-level request history log showing every API call made, its method, status code and response time, along with live metrics on the dashboard for total calls, success count, error count and average response time.

---

## Security

Access to the portal is restricted to a single designated owner account. All sessions are protected by OAuth 2.0 with PKCE. No credentials or tokens are stored in the browser. The portal operates under Axis Bank's API governance framework and is compliant with RBI guidelines for corporate payout systems.

---

*kakasfinance — Private and confidential. Unauthorised access is prohibited.*
