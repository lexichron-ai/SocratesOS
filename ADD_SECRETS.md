# 🔐 Add Secrets - Quick Links

## Click These Links to Add Your Secrets

### 1️⃣ Add Stripe Secret Key
**Direct Link**: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions/new

**Steps:**
1. Click the link above
2. In "Name" field, type: `STRIPE_SECRET_KEY`
3. In "Value" field, paste your Stripe secret key
4. Click "Add secret"

---

### 2️⃣ Add Firebase Staging Token
**Direct Link**: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions/new

**Steps:**
1. Click the link above
2. In "Name" field, type: `FIREBASE_TOKEN_STAGING`
3. In "Value" field, paste your Firebase token
4. Click "Add secret"

---

### 3️⃣ Add Firebase Production Token
**Direct Link**: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions/new

**Steps:**
1. Click the link above
2. In "Name" field, type: `FIREBASE_TOKEN_PROD`
3. In "Value" field, paste your Firebase token (same as staging)
4. Click "Add secret"

---

### 4️⃣ Add Gemini API Key
**Direct Link**: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions/new

**Steps:**
1. Click the link above
2. In "Name" field, type: `GEMINI_API_KEY`
3. In "Value" field, paste your Gemini API key
4. Click "Add secret"

---

### 5️⃣ Add SonarCloud Token (Optional)
**Direct Link**: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions/new

**Steps:**
1. Click the link above
2. In "Name" field, type: `SONAR_TOKEN`
3. In "Value" field, paste your SonarCloud token
4. Click "Add secret"

---

## 📋 Where to Get Each Secret

| Secret | Where to Get It |
|--------|-----------------|
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys |
| `FIREBASE_TOKEN_STAGING` | Run: `firebase login:ci` in terminal |
| `FIREBASE_TOKEN_PROD` | Run: `firebase login:ci` in terminal |
| `GEMINI_API_KEY` | https://makersuite.google.com/app/apikey |
| `SONAR_TOKEN` | https://sonarcloud.io/account/security |

---

## ✅ Checklist

- [ ] STRIPE_SECRET_KEY added
- [ ] FIREBASE_TOKEN_STAGING added
- [ ] FIREBASE_TOKEN_PROD added
- [ ] GEMINI_API_KEY added
- [ ] SONAR_TOKEN added (optional)

---

## 🎯 Minimum to Get Started

You only **need** these 2 to start:
- ✅ STRIPE_SECRET_KEY (you have it!)
- ⏳ FIREBASE_TOKEN_STAGING & PROD

The other 2 are optional for now.

---

## 🚀 Next After Secrets

Once secrets are added:
1. Push your code to GitHub
2. Workflows run automatically
3. Everything deploys automatically!

Ready to add the Firebase tokens?
