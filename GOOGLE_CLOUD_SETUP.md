# Google Cloud OAuth & Verification Setup Guide

Penny connects to Gmail using **Google OAuth 2.0** with strict **read-only access** (`https://www.googleapis.com/auth/gmail.readonly`).

> **Important Security & Privacy Notice:**
> Penny never asks for or stores your Gmail password. Google's permissions architecture requires granting mailbox read access to read emails, but Penny's rule-based parser scans **strictly selected bank alert senders and payment receipts**, immediately discarding full email bodies after extracting transaction metadata (amount, merchant, date, reference). OAuth tokens are encrypted at rest with AES-256-GCM.
> 
> Penny does **not** pretend the live Gmail connection works before valid credentials are configured in your environment.

---

## 1. Create a Google Cloud Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name your project (e.g., `Penny Expense Tracker`) and click **Create**.

---

## 2. Enable the Gmail API

1. In your project, open the left navigation menu and go to **APIs & Services** > **Library**.
2. Search for **Gmail API**.
3. Click on **Gmail API** and click **Enable**.

---

## 3. Configure the OAuth Consent Screen

1. In the left sidebar, navigate to **APIs & Services** > **OAuth consent screen**.
2. Select User Type:
   - **External** (standard for personal Google accounts or public applications).
   - Click **Create**.
3. Fill in the App Information:
   - **App name:** `Penny`
   - **User support email:** Select your Gmail address.
   - **Developer contact information:** Enter your email address.
   - Click **Save and Continue**.
4. Configure Scopes:
   - Click **Add or Remove Scopes**.
   - Search for or manually add:
     - `https://www.googleapis.com/auth/gmail.readonly` (Read resources from Gmail)
     - `https://www.googleapis.com/auth/userinfo.email` (View your email address)
   - Click **Update** and then **Save and Continue**.
5. **Test Users (Crucial for Development / Testing Mode):**
   - While your app's publishing status is in **Testing**, Google restricts OAuth access strictly to accounts listed in the **Test users** table.
   - Click **Add Users** and enter the Gmail address(es) you intend to test with.
   - Click **Save and Continue**.

---

## 4. Create OAuth 2.0 Client ID Credentials

1. Go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Choose Application Type: **Web application**.
4. Set the **Name** to `Penny Web Client`.
5. Under **Authorized redirect URIs**, click **+ Add URI** and add:
   - For local development:
     ```text
     http://localhost:8888/api/gmail/callback
     http://localhost:5173/api/gmail/callback
     ```
   - For production Netlify deployment:
     ```text
     https://<your-site-name>.netlify.app/api/gmail/callback
     ```
6. Click **Create**.
7. Google will display your **Client ID** and **Client Secret**. Copy these values.

---

## 5. Configure Environment Variables

Create a `.env` file in the project root or configure these in **Netlify Site Settings** > **Environment variables**:

```bash
# Google Cloud OAuth Credentials
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret-here"
GOOGLE_REDIRECT_URI="http://localhost:8888/api/gmail/callback"

# Security Secrets (Generate secure random 32-character strings)
JWT_SECRET="penny-secure-jwt-production-secret-key-32b"
ENCRYPTION_KEY="penny-aes-256-gcm-encryption-key-32b"
```

---

## 6. Google Verification Requirements (For Public Production)

If you plan to publish Penny publicly for users outside your Test Users list:

1. **Restricted Scope Verification:**
   - `gmail.readonly` is classified as a **Restricted Scope** by Google.
   - Google requires an OAuth Verification Process, including:
     - A publicly accessible **Privacy Policy** detailing that data is not sold or used for advertising.
     - A YouTube video demonstration showing how the app requests OAuth and imports bank transactions.
     - Annual security assessment under the **Cloud Application Security Assessment (CASA Tier 2)** standard by an authorized lab.
2. **Personal / Internal Use:**
   - If you are running Penny for yourself, your family, or a small team, you can keep the Google Cloud app in **Testing Mode** indefinitely. Simply add the permitted Gmail addresses to the **Test Users** list in the Google Cloud Console (up to 100 test users supported without verification).

---

## 7. Demo Mode (Zero Credentials Required)

Penny includes a built-in **Demo Mode** accessible directly from the app interface:
- Allows testing the rule-based email parser on realistic bank alert templates (Chase, PayPal, Stripe, Apple, internal transfers, refunds, OTP filtering, duplicate detection).
- All demo data is **prominently labeled with a warning banner** ("DEMO DATA — NOT A REAL GMAIL IMPORT") and can be removed with a single click.
