# Backend Integration Guide

This guide covers deploying the `SocratesEvaluationEngine` as a Firebase Cloud Function and wiring it to the FlutterFlow frontend.

---

## Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)
- (Optional) Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

---

## 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/lexichron-ai/SocratesOS.git
cd SocratesOS

# Install root dependencies
npm install

# Install Cloud Function dependencies
cd functions && npm install && cd ..

# Authenticate with Firebase
firebase login

# Link to your Firebase project
firebase use --add
# Select your project and give it an alias (e.g. "staging" or "production")
```

---

## 2. Environment Variables

Copy the template and fill in real values:

```bash
cp .env.example .env.local
```

Required for local development:

| Variable | Source |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase console → Project settings |
| `FIREBASE_API_KEY` | Firebase console → Project settings |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — optional, enables AI mode |

---

## 3. Run Locally with Emulators

```bash
firebase emulators:start
```

This starts:
- **Functions emulator** on `http://localhost:5001`
- **Hosting emulator** on `http://localhost:5000`
- **Emulator UI** on `http://localhost:4000`

Test the endpoint:

```bash
curl -X POST http://localhost:5001/<PROJECT_ID>/us-central1/evaluateDiscourse \
  -H "Content-Type: application/json" \
  -d '{"text": "I respectfully disagree. However, the evidence clearly shows a different outcome."}'
```

Expected response:

```json
{
  "dqs_score": 72,
  "sentiment": 0.1,
  "coherence": 55,
  "engagement": 48,
  "toxicity": 0,
  "fallacies_detected": [],
  "civility_status": "civil",
  "actionable_recommendations": [
    "Expand your point with supporting evidence or a follow-up question."
  ],
  "mode": "rule-based",
  "timestamp": "2026-07-04T00:00:00.000Z"
}
```

---

## 4. Configure the Gemini API Key (AI Mode)

When `GEMINI_API_KEY` is set, the engine automatically upgrades from rule-based to Gemini AI analysis.

### For local development

Add to `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

Then run the emulator with:

```bash
firebase emulators:start --import=./emulator-data
```

### For deployed environments

Use Firebase Secret Manager (recommended — never commit keys):

```bash
# Set the secret
firebase functions:secrets:set GEMINI_API_KEY

# Grant the Cloud Function access
firebase deploy --only functions
```

The Cloud Function is already configured to consume this secret via `runWith({ secrets: ["GEMINI_API_KEY"] })`.

---

## 5. Deploy to Firebase

### Build the TypeScript source

```bash
cd functions && npm run build && cd ..
```

### Deploy to staging

```bash
firebase deploy --project staging-socratesai
```

### Deploy to production

```bash
firebase deploy --project prod-socratesai
```

Or use the GitHub Actions `deploy.yml` workflow — it deploys automatically on push to `main`.

---

## 6. API Reference

### `POST /api/evaluate`

Evaluates the discourse quality of the provided text.

**Request body**

```json
{
  "text": "string (required, max 10,000 chars)",
  "context": "string (optional) — topic or background context",
  "userId": "string (optional) — Firebase UID for analytics"
}
```

**Response (200)**

```json
{
  "dqs_score": 0-100,
  "sentiment": -1.0 to 1.0,
  "coherence": 0-100,
  "engagement": 0-100,
  "toxicity": 0-100,
  "fallacies_detected": ["ad hominem", "..."],
  "civility_status": "civil" | "borderline" | "uncivil",
  "actionable_recommendations": ["string", "..."],
  "mode": "rule-based" | "ai",
  "timestamp": "ISO 8601 string"
}
```

**Error responses**

| Status | Body | Reason |
|---|---|---|
| 400 | `{ "error": "Missing required field: text" }` | No `text` in body |
| 400 | `{ "error": "text must be 10,000 characters or fewer" }` | Text too long |
| 405 | `{ "error": "Method not allowed. Use POST." }` | Wrong HTTP method |
| 500 | `{ "error": "Internal evaluation error. Please try again." }` | Unexpected server error |

### `GET /api/health`

Returns service status.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "ISO 8601 string"
}
```

---

## 7. Wiring the FlutterFlow Frontend

In your FlutterFlow project, create a **Custom Action** or **API Call** with:

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `https://<your-region>-<PROJECT_ID>.cloudfunctions.net/evaluateDiscourse` |
| Header | `Content-Type: application/json` |
| Body | `{ "text": [discourseTextField], "userId": [currentUser.uid] }` |

Map the JSON response fields to UI elements:

| JSON field | UI element |
|---|---|
| `dqs_score` | Score circle / progress bar |
| `civility_status` | Civility status badge (civil / borderline / uncivil) |
| `fallacies_detected` | Fallacy chips list |
| `actionable_recommendations` | Recommendations list |
| `coherence` | Coherence meter |
| `engagement` | Engagement meter |
| `toxicity` | Toxicity meter |

Once Firebase Hosting is set up with the rewrite rules in `firebase.json`, the shorter URL `/api/evaluate` also works.

---

## 8. Firestore Data

Each evaluation writes a document to the `discourses` collection:

```
discourses/{auto-id}
  userId: string | null
  content: string
  dqsScore: { ...full DQSResult object }
  metadata:
    context: string | null
  createdAt: Timestamp
```

You can use these documents to power the analytics dashboard (issue #2/#9).

---

## 9. Troubleshooting

**Functions deploy fails**
- Ensure `npm run build` succeeds in the `functions/` directory before deploying
- Check that `FIREBASE_TOKEN` / `FIREBASE_TOKEN_STAGING` / `FIREBASE_TOKEN_PROD` secrets are set in GitHub Actions

**Gemini API returns errors**
- Verify the key is valid at [aistudio.google.com](https://aistudio.google.com)
- The engine automatically falls back to rule-based analysis on Gemini failures — check Cloud Function logs for the warning

**CORS issues from FlutterFlow**
- The function sets `Access-Control-Allow-Origin: *`; no additional config should be needed
- For production, consider restricting the origin to your app domain
