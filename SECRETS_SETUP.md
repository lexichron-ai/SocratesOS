# 🔐 Secrets Configuration Guide

## How to Configure GitHub Secrets for SocratesOS

**Time needed**: 15-20 minutes  
**Access**: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions

---

## 📋 Secrets You Need to Add

| Secret | Type | Priority | Status |
|--------|------|----------|--------|
| `FIREBASE_TOKEN_STAGING` | Firebase | 🔴 Critical | ⏳ Pending |
| `FIREBASE_TOKEN_PROD` | Firebase | 🔴 Critical | ⏳ Pending |
| `SONAR_TOKEN` | SonarCloud | 🟡 Important | ⏳ Pending |
| `STRIPE_SECRET_KEY` | Stripe | 🔴 Critical | ✅ Have account |
| `GEMINI_API_KEY` | Google | 🟡 Important | ⏳ Pending |

---

## 1️⃣ Firebase Tokens (CRITICAL)

### Step 1: Generate Firebase Token
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login and generate CI token
firebase login:ci

# Follow the browser prompts to authenticate
# A token will be generated - COPY IT
```

### Step 2: Add to GitHub
- Go to: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions
- Click: **New repository secret**
- Name: `FIREBASE_TOKEN_STAGING`
- Value: Paste your Firebase token
- Click: **Add secret**

### Step 3: Repeat for Production
- Do the same process again for `FIREBASE_TOKEN_PROD` 
- Use the same token (it works for both environments)

**Result:**
```
✅ FIREBASE_TOKEN_STAGING - Added
✅ FIREBASE_TOKEN_PROD - Added
```

---

## 2️⃣ Stripe Secret Key (CRITICAL)

### Step 1: Get Your Stripe Secret Key
1. Go to: https://dashboard.stripe.com/apikeys
2. Look for **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Click the **eye icon** to reveal it
4. **Copy** the full key

### Step 2: Add to GitHub
- Go to: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions
- Click: **New repository secret**
- Name: `STRIPE_SECRET_KEY`
- Value: Paste your Stripe secret key
- Click: **Add secret**

**Result:**
```
✅ STRIPE_SECRET_KEY - Added
```

---

## 3️⃣ Gemini API Key (IMPORTANT)

### Step 1: Get Your Gemini API Key
1. Go to: https://makersuite.google.com/app/apikey
2. Click: **Create API key**
3. Select your project
4. Copy the generated key

### Step 2: Add to GitHub
- Go to: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions
- Click: **New repository secret**
- Name: `GEMINI_API_KEY`
- Value: Paste your Gemini API key
- Click: **Add secret**

**Result:**
```
✅ GEMINI_API_KEY - Added
```

---

## 4️⃣ SonarCloud Token (IMPORTANT)

### Step 1: Get Your SonarCloud Token
1. Go to: https://sonarcloud.io/account/security
2. Click: **Generate Tokens**
3. Name: `SocratesOS-GitHub`
4. Click: **Generate**
5. **Copy** the token

### Step 2: Add to GitHub
- Go to: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions
- Click: **New repository secret**
- Name: `SONAR_TOKEN`
- Value: Paste your SonarCloud token
- Click: **Add secret**

**Result:**
```
✅ SONAR_TOKEN - Added
```

---

## ✅ Verification Checklist

After adding all secrets, verify they're configured:

```
Go to: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions

You should see:
☑️ FIREBASE_TOKEN_STAGING
☑️ FIREBASE_TOKEN_PROD
☑️ STRIPE_SECRET_KEY
☑️ GEMINI_API_KEY
☑️ SONAR_TOKEN

If you see all 5, you're ready to push code! 🚀
```

---

## 🔒 Security Best Practices

- ✅ **Never commit secrets** to code
- ✅ **Use .env.example** for templates only
- ✅ **Rotate tokens regularly** (every 90 days recommended)
- ✅ **Use different tokens** for staging vs production
- ✅ **Delete old tokens** when rotating

---

## 📝 What These Secrets Do

| Secret | Used By | Purpose |
|--------|---------|---------|
| `FIREBASE_TOKEN_*` | Deploy workflow | Authenticate with Firebase for deployment |
| `STRIPE_SECRET_KEY` | API endpoints | Process payments and manage subscriptions |
| `GEMINI_API_KEY` | DQS service | Evaluate discourse quality with AI |
| `SONAR_TOKEN` | Quality workflow | Analyze code quality metrics |

---

## 🆘 Troubleshooting

### "Secret not found" error in workflows
- **Check**: Make sure secret name matches exactly (case-sensitive)
- **Check**: Secret is added to correct repository
- **Wait**: Sometimes takes a few minutes to propagate

### "Invalid token" error during deployment
- **Verify**: Token is valid and not expired
- **Verify**: Token has correct permissions
- **Regenerate**: Try creating a new token

### "Deploy still failing after adding secrets"
- **Check**: All 5 secrets are configured
- **Check**: Secret names match exactly
- **View**: GitHub Actions logs for specific error
- **Try**: Push a test commit to trigger workflow

---

## 🚀 Next Steps After Adding Secrets

1. **Push your first commit**
   ```bash
   git checkout -b feature/initial-setup
   # Add your code
   git commit -m "feat: Initial project setup"
   git push origin feature/initial-setup
   ```

2. **Watch the workflows run**
   - Go to: https://github.com/lexichron-ai/SocratesOS/actions
   - You should see CI pipeline running
   - Check logs if anything fails

3. **Create Pull Request**
   - GitHub will prompt you to create PR
   - Or go to: https://github.com/lexichron-ai/SocratesOS/pulls

---

## 📊 Status Tracker

Use this to track your progress:

- [ ] Firebase token generated
- [ ] FIREBASE_TOKEN_STAGING added
- [ ] FIREBASE_TOKEN_PROD added
- [ ] Stripe secret key obtained
- [ ] STRIPE_SECRET_KEY added
- [ ] Gemini API key obtained
- [ ] GEMINI_API_KEY added
- [ ] SonarCloud token obtained
- [ ] SONAR_TOKEN added
- [ ] All 5 secrets verified on GitHub
- [ ] Ready to push code! 🚀

---

## 💬 Questions?

| Question | Answer |
|----------|--------|
| **Where do I add secrets?** | https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions |
| **Can I delete a secret?** | Yes, click the trash icon |
| **Can I edit a secret?** | Delete and re-add with new value |
| **Are secrets visible in logs?** | No, GitHub masks them automatically |

---

**Estimated Time**: 15 minutes  
**Difficulty**: Easy  
**Impact**: Critical for deployment

---

**Created**: July 3, 2026  
**Status**: Ready to configure  
**Next**: Follow steps above, then push code!
