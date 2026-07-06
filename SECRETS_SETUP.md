# 🔐 Secrets Configuration Guide

## How to Configure GitHub Secrets for SocratesOS

**Time needed**: 20-30 minutes  
**Access**: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions

> ⚠️ **Note:** The deploy workflow uses **Workload Identity Federation** (keyless auth) for Firebase/GCP.
> This avoids the need for service account JSON keys, which are blocked by the GCP org policy
> `constraints/iam.disableServiceAccountKeyCreation`. No JSON key file is ever created or stored.

---

## 📋 Secrets You Need to Add

| Secret | Type | Priority | Status |
|--------|------|----------|--------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING` | GCP/Firebase | 🔴 Critical | ⏳ Pending |
| `GCP_SERVICE_ACCOUNT_STAGING` | GCP/Firebase | 🔴 Critical | ⏳ Pending |
| `GCP_WORKLOAD_IDENTITY_PROVIDER_PROD` | GCP/Firebase | 🔴 Critical | ⏳ Pending |
| `GCP_SERVICE_ACCOUNT_PROD` | GCP/Firebase | 🔴 Critical | ⏳ Pending |
| `SONAR_TOKEN` | SonarCloud | 🟡 Important | ⏳ Pending |
| `STRIPE_SECRET_KEY` | Stripe | 🔴 Critical | ✅ Have account |
| `GEMINI_API_KEY` | Google | 🟡 Important | ⏳ Pending |

---

## 1️⃣ Firebase / GCP – Workload Identity Federation (CRITICAL)

This is the **keyless** approach required when your GCP org blocks service account key creation.
GitHub Actions gets a short-lived token automatically — no JSON file needed.

### Step 1: Create a Service Account in GCP

In [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts):

1. Select your **staging project** (e.g. `staging-socratesai`)
2. Click **Create Service Account**
3. Name: `github-actions-deploy`
4. Grant it the **Firebase Admin** role (or `roles/firebase.admin`)
5. Click **Done** — do NOT create a key

Copy the full service account email, e.g.:
`github-actions-deploy@staging-socratesai.iam.gserviceaccount.com`

Repeat for the **production project**.

### Step 2: Create a Workload Identity Pool

In [Workload Identity Federation](https://console.cloud.google.com/iam-admin/workload-identity-pools):

1. Click **Create Pool**
2. Name: `github-actions`
3. Click **Add Provider** → choose **OpenID Connect (OIDC)**
4. Provider name: `github`
5. Issuer URL: `https://token.actions.githubusercontent.com`
6. Under **Attribute Mapping**, add:
   - `google.subject` → `assertion.sub`
   - `attribute.repository` → `assertion.repository`
7. Under **Attribute Conditions**, add:
   ```
   attribute.repository == "lexichron-ai/SocratesOS"
   ```
8. Click **Save**

### Step 3: Grant the Service Account Access to the Pool

1. In the pool you created, click **Grant Access**
2. Select your service account (`github-actions-deploy@...`)
3. Under **Select principals**, choose:
   - Attribute: `repository`
   - Value: `lexichron-ai/SocratesOS`
4. Click **Save**

### Step 4: Get the Provider Resource Name

After creating the pool, copy the **full provider name**. It looks like:
```
projects/123456789/locations/global/workloadIdentityPools/github-actions/providers/github
```

You can find it in the pool details page.

### Step 5: Add Secrets to GitHub

Go to: https://github.com/lexichron-ai/SocratesOS/settings/secrets/actions

| Secret Name | Value |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING` | Full provider resource name (staging project) |
| `GCP_SERVICE_ACCOUNT_STAGING` | `github-actions-deploy@staging-socratesai.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER_PROD` | Full provider resource name (prod project) |
| `GCP_SERVICE_ACCOUNT_PROD` | `github-actions-deploy@prod-socratesai.iam.gserviceaccount.com` |

**Result:**
```
✅ GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING - Added
✅ GCP_SERVICE_ACCOUNT_STAGING - Added
✅ GCP_WORKLOAD_IDENTITY_PROVIDER_PROD - Added
✅ GCP_SERVICE_ACCOUNT_PROD - Added
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
| `GCP_WORKLOAD_IDENTITY_PROVIDER_*` | Deploy workflow | Keyless GCP auth via GitHub OIDC token |
| `GCP_SERVICE_ACCOUNT_*` | Deploy workflow | Identity to impersonate for Firebase deploy |
| `STRIPE_SECRET_KEY` | API endpoints | Process payments and manage subscriptions |
| `GEMINI_API_KEY` | DQS service | Evaluate discourse quality with AI |
| `SONAR_TOKEN` | Quality workflow | Analyze code quality metrics |

---

## 🆘 Troubleshooting

### "Secret not found" error in workflows
- **Check**: Make sure secret name matches exactly (case-sensitive)
- **Check**: Secret is added to correct repository
- **Wait**: Sometimes takes a few minutes to propagate

### "Unable to create service account key" in GCP
- **Cause**: Org policy `constraints/iam.disableServiceAccountKeyCreation` is active
- **Solution**: Use Workload Identity Federation as documented above — no key needed

### "Invalid identity token" / WIF auth failure
- **Check**: The Workload Identity Pool issuer URL is exactly `https://token.actions.githubusercontent.com`
- **Check**: The attribute condition matches `lexichron-ai/SocratesOS`
- **Check**: The service account has been granted access to the WIF pool
- **Check**: The `id-token: write` permission is set in the workflow (already done)

### "Deploy still failing after adding secrets"
- **Check**: All 4 GCP secrets are configured
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

- [ ] GCP Workload Identity Pool created (staging project)
- [ ] Service account `github-actions-deploy` created (staging)
- [ ] WIF pool granted access to service account (staging)
- [ ] GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING added to GitHub
- [ ] GCP_SERVICE_ACCOUNT_STAGING added to GitHub
- [ ] GCP Workload Identity Pool created (prod project)
- [ ] Service account `github-actions-deploy` created (prod)
- [ ] WIF pool granted access to service account (prod)
- [ ] GCP_WORKLOAD_IDENTITY_PROVIDER_PROD added to GitHub
- [ ] GCP_SERVICE_ACCOUNT_PROD added to GitHub
- [ ] Stripe secret key obtained
- [ ] STRIPE_SECRET_KEY added
- [ ] Gemini API key obtained
- [ ] GEMINI_API_KEY added
- [ ] SonarCloud token obtained
- [ ] SONAR_TOKEN added
- [ ] All secrets verified on GitHub
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
