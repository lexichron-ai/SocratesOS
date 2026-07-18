# Backend Integration Guide

This guide explains how to deploy the **SocratesOS evaluation engine** as a
Firebase Cloud Function and how to call it from a client application.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 LTS | <https://nodejs.org> |
| Firebase CLI | ≥ 13.0 | `npm install -g firebase-tools` |
| Google Cloud account | — | <https://console.cloud.google.com> |

You will also need a **Gemini API key** from
[Google AI Studio](https://aistudio.google.com/apikey).

---

## 1. Clone and Install

```bash
git clone https://github.com/lexichron-ai/SocratesOS.git
cd SocratesOS/functions
npm install
```

---

## 2. Set the GEMINI_API_KEY Secret

The function reads `GEMINI_API_KEY` from
[Firebase Secret Manager](https://firebase.google.com/docs/functions/config-env#secret-manager).
Set it once per project (not per deploy):

```bash
firebase use staging          # or: firebase use production

# Store the secret in Secret Manager
firebase functions:secrets:set GEMINI_API_KEY
# You will be prompted to enter the key value interactively.
```

> **Security note:** Never commit your API key to source control or pass it as
> an environment variable on the command line.

---

## 3. Build

```bash
cd functions
npm run build       # compiles TypeScript → dist/
```

---

## 4. Run Tests

```bash
cd functions
npm test
```

All tests mock the Gemini API so no real API calls are made during CI.

---

## 5. Local Emulation (optional)

```bash
# From the repo root
firebase emulators:start --only functions
```

The function will be available at:

```
http://127.0.0.1:5001/<project-id>/us-central1/evaluateDiscourse
```

For local testing the `GEMINI_API_KEY` secret must be set in Secret Manager
**and** you must be authenticated with the Firebase CLI (`firebase login`).

---

## 6. Deploy

```bash
# Deploy to the default (staging) project
firebase deploy --only functions

# Deploy to production
firebase use production
firebase deploy --only functions
```

Firebase will automatically:
1. Build the TypeScript source (`npm run build` via `predeploy` hook).
2. Upload the compiled `dist/` to Google Cloud Functions.
3. Inject the `GEMINI_API_KEY` secret at runtime.

---

## 7. Using the Function

### Endpoint

```
POST https://us-central1-<project-id>.cloudfunctions.net/evaluateDiscourse
Content-Type: application/json
```

### Request Body

```json
{
  "text": "The discourse text you want to evaluate."
}
```

### Success Response (HTTP 200)

```json
{
  "score": 75,
  "sentiment": 0.4,
  "coherence": 80,
  "engagement": 70,
  "toxicity": 5,
  "recommendations": [
    "Add supporting evidence to strengthen your argument.",
    "Reduce jargon to improve accessibility."
  ],
  "timestamp": "2026-01-15T12:34:56.789Z"
}
```

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `score` | integer | 0–100 | Overall discourse quality |
| `sentiment` | float | −1 to 1 | Negative = hostile, positive = constructive |
| `coherence` | integer | 0–100 | Logical structure and consistency |
| `engagement` | integer | 0–100 | Likelihood of productive participation |
| `toxicity` | integer | 0–100 | Harmful/abusive language (0 = none) |
| `recommendations` | string[] | — | Actionable improvement suggestions |
| `timestamp` | string | — | ISO 8601 evaluation timestamp |

### Error Responses

| HTTP | Shape | Cause |
|------|-------|-------|
| 400 | `{ "error": "..." }` | Missing or empty `text` field |
| 405 | `{ "error": "..." }` | Non-POST request |
| 500 | `{ "error": "..." }` | Gemini API error or unexpected exception |

---

## 8. GitHub Actions CI/CD

The repository's `.github/workflows/deploy.yml` handles automated deploys.
Add the following secrets in **Settings → Secrets and variables → Actions**:

| Secret name | Value |
|-------------|-------|
| `FIREBASE_TOKEN` | Output of `firebase login:ci` |
| `GEMINI_API_KEY` | Your Gemini API key (stored in Secret Manager, but also needed for CI to grant access) |

The workflow runs `npm test` before every deploy and aborts on failure.

---

## 9. Architecture

```
Client (FlutterFlow / REST)
        │
        │ POST /evaluateDiscourse
        ▼
Firebase Cloud Function (Node 20, TypeScript)
   └─ functions/src/index.ts  →  evaluateDiscourse (onRequest, v2)
        │
        ▼
SocratesEvaluationEngine
   └─ functions/src/evaluation.ts
        │
        ▼
Google Gemini API  (gemini-1.5-flash)
        │
        ▼
DiscourseQualityScore { score, sentiment, coherence, engagement, toxicity, recommendations }
```

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `GEMINI_API_KEY is required` error in logs | Run `firebase functions:secrets:set GEMINI_API_KEY` and redeploy |
| `Method Not Allowed` response | Ensure the client sends a `POST` request |
| Empty or malformed Gemini response | Check Gemini API quota and key validity in [Google AI Studio](https://aistudio.google.com) |
| Build fails with TypeScript errors | Run `cd functions && npm run build` locally to see compiler output |
