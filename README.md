# QuotePolicyAssesment
A minimal PolicyQuote application a single-page home insurance policy quoting tool that lets a customer enter their details and receive an instant premium estimate with a risk assessment.
PolicyQuote

Backend
```bash
cd backend
npm install
npm start
```
Runs on http://localhost:3000. Endpoint: POST /policy/quote.

Frontend
```bash
cd frontend
npm install
npm start
```
Runs on http://localhost:4200.

KB config

Risk rules live at kb/risk-kb.json. Add, edit, or remove a factor there, no code changes required.
