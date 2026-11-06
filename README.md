# Penny — Mobile-Friendly Expense Tracker & Gmail Sync

Penny is a modern, mobile-friendly Progressive Web App (PWA) expense tracker designed for deployment on **Netlify**. It securely imports bank alerts and payment receipts from **Gmail** (using official read-only Google OAuth), categorizes transactions with a transparent rule-based engine, isolates multi-currency spending, generates analytics, and calculates savings goals with automated affordability checks.

---

## Highlights & Key Features

### 1. Gmail Connection & OAuth
- **Strict Read-Only Access (`gmail.readonly`):** Connects via Google OAuth 2.0. Never requests or stores the user's Gmail password.
- **Transparent Privacy Notice:** In-app explanations detail that while Google's standard permissions grant mailbox read access, Penny processes **strictly filtered financial alerts** from specified bank senders.
- **Sender & Folder Filtering:** Lets users select financial senders (Chase, Bank of America, Wells Fargo, Amex, Capital One, PayPal, Stripe, Apple, Monzo, Revolut, etc.) or add custom sender domains, specify Gmail labels (`INBOX`, `Receipts`, `Finance`), and configure date ranges (7d, 30d, 90d, All).
- **Controls & Clear Status:** Provides real-time **Sync Now**, **Disconnect**, and token revocation controls.
- **No False Pretenses:** Explicitly checks if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. Never pretends the connection is active before valid keys are supplied.
- **Demo Mode Testing:** Includes a one-click simulation that feeds realistic bank emails through the parser so you can test all features without connecting a Google account.

### 2. Transaction Detection & Rule-Based Parsing
- **Clean Field Extraction:** Parses amount, ISO currency code (USD, EUR, GBP, AUD, CAD, etc.), merchant/payee, transaction date, type (`expense`, `income`, `refund`, `transfer`), and reference / auth number.
- **Anti-Balance Protection:** Explicitly masks and distinguishes account balances (e.g. `Available Balance: $4,210.50`) from actual transaction amounts (`Spent $48.25 at Trader Joe's`).
- **Strict Disqualifiers:**
  - Ignores OTPs and 2FA security codes (`verification code`, `one-time password`, `use code 849201`).
  - Ignores failed or declined transactions (`payment declined`, `insufficient funds`).
  - Ignores temporary authorization holds (`pre-authorization hold of $1.00`).
  - Ignores promotional marketing spam (`earn 5% cash back`).
- **Dedicated Review Queue:** Routes ambiguous matches (e.g., generic `POS DEBIT` without vendor name) or low-confidence alerts to a review screen with 1-click **Approve**, **Edit**, or **Dismiss** options.
- **Duplicate Prevention:** Tracks `gmailMessageId` and `referenceNumber` to drop duplicates immediately; flags fuzzy duplicates (same date, amount, currency, and merchant) with an `isPossibleDuplicate` badge in the Review Queue.
- **Accurate Type Classification:**
  - **Expenses:** Added to spending totals.
  - **Income:** Added to earnings / cash inflow.
  - **Refunds:** Offset expenses in corresponding categories without artificially inflating income.
  - **Transfers:** Kept separate so internal account transfers and credit card payments do not double-count spending.

### 3. Transaction Management & Currency Isolation
- **Manual Entries & Editing:** Create, edit, and delete transactions with custom dates, references, and notes.
- **Smart Category Suggestions:** Automatically suggests categories based on merchant names and transaction keywords (Groceries, Dining & Food, Utilities & Bills, Subscriptions & Software, Transport & Fuel, Shopping, Health & Fitness, Travel, etc.) while allowing users to override them.
- **Strict Currency Isolation:** Multi-currency amounts are kept strictly separated (USD, EUR, GBP, AUD, CAD) to prevent mathematical distortion.
- **Search & Filters:** Real-time search by merchant, notes, or reference number, with category, type, and currency filters.

### 4. Spending Reports & Budget Goals
- **Interactive Visualizations:** Chart.js trends comparison (monthly income vs expenses) and doughnut category breakdown.
- **CSV Export:** 1-click RFC-4180 compliant CSV export with full transaction history.
- **Savings Goals Calculator:**
  - Input monthly net income, essential expenses, savings target, current savings, and target deadline.
  - Calculates months remaining, remaining savings needed, required monthly savings, and remaining discretionary spending budget.
  - **Affordability Warning:** Automatically detects when required monthly savings + essential expenses exceed income, displaying a warning banner with the exact monthly deficit and suggested adjustments.
  - **Suggested Category Limits:** Proposes recommended discretionary spending limits across key categories (Groceries, Dining, Shopping, Subscriptions, Transport), with editable inputs.
  - **Prominent Coverage Notice:** States clearly that reports reflect imported and manually logged transactions, which may not capture cash or unlinked accounts.

### 5. Technical, Privacy & Security Architecture
- **Authenticated Accounts:** User authentication with `bcryptjs` password hashing and stateless JWT session tokens.
- **User Ownership Enforcement:** Every backend Netlify function verifies the JWT and scopes database queries strictly to `req.userId`. Cross-user data leakage is prevented.
- **Token Protection:** OAuth tokens (access and refresh tokens) are encrypted before persisting to storage using **AES-256-GCM**.
- **Server-Side Credentials:** OAuth client credentials and tokens remain strictly server-side.
- **Zero Raw Email Retention:** Email bodies are processed in-memory by the rule-based parser and immediately discarded.
- **PWA Ready:** Includes `manifest.json`, Service Worker offline caching, iOS mobile web app meta tags, touch-optimized UI, and bottom navigation.
- **Clearly Labeled Demo Data:** All demo items carry a prominent warning banner (`DEMO DATA — NOT A REAL GMAIL IMPORT`) and can be purged in Settings.

---

## Architecture

```
Penny/
├── index.html                   # Mobile PWA entry point & meta tags
├── netlify.toml                 # Netlify build and redirect configuration
├── package.json                 # Dependencies and test scripts
├── vite.config.js               # Vite build config + local dev API proxy
├── GOOGLE_CLOUD_SETUP.md        # Step-by-step Google OAuth & verification guide
├── public/
│   ├── manifest.json            # PWA Web App Manifest
│   ├── sw.js                    # Service Worker with offline caching
│   └── icons/                   # High-res PWA application icons
├── src/
│   ├── main.jsx                 # React root
│   ├── App.jsx                  # Main application state & layout
│   ├── index.css                # Tailwind CSS & safe-area styles
│   ├── context/
│   │   └── AuthContext.jsx      # Authentication & currency context
│   ├── components/
│   │   ├── Navbar.jsx           # Top header & currency switcher
│   │   ├── BottomNav.jsx        # Mobile touch-friendly bottom navigation
│   │   ├── DemoBanner.jsx       # Prominent demo data alert
│   │   ├── GmailConnectModal.jsx# OAuth connection dialog & sender filters
│   │   ├── TransactionModal.jsx # Add / Edit transaction modal
│   │   └── CategoryBadge.jsx    # Category badge styling
│   ├── pages/
│   │   ├── Dashboard.jsx        # Summary cards, recent items, review alert
│   │   ├── TransactionsPage.jsx # Search, filter, edit, delete, export CSV
│   │   ├── ReviewPage.jsx       # Flagged alerts & possible duplicates
│   │   ├── ReportsPage.jsx      # Spending charts & category breakdown
│   │   ├── GoalsPage.jsx        # Goal calculations & affordability warning
│   │   ├── SettingsPage.jsx     # Connection, data wiping, privacy summary
│   │   └── AuthPage.jsx         # Sign in, sign up, 1-click demo login
│   ├── services/
│   │   └── api.js               # Client API service
│   └── utils/
│       ├── currency.js          # Currency formatting
│       ├── formatters.js        # Date formatting
│       └── exportCsv.js         # RFC-4180 CSV exporter
└── netlify/
    └── functions/
        ├── api.js               # Unified Netlify serverless function handler
        ├── utils/
        │   ├── auth.js          # JWT & bcrypt authentication
        │   ├── crypto.js        # AES-256-GCM token encryption
        │   ├── db.js            # Persistent storage engine with user isolation
        │   ├── gmailParser.js   # Rule-based email transaction parser
        │   ├── googleClient.js  # OAuth2 flow & Gmail REST API client
        │   └── budgetCalculations.js # Goal & report math
        └── __tests__/
            ├── parser.test.js   # 9 email parser test cases
            ├── budget.test.js   # Report & goal math tests
            ├── security.test.js # Token encryption & user ownership tests
            └── api_integration.test.js # End-to-end API integration tests
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v25)
- **npm** v9+

### 2. Installation
```bash
# Clone or navigate to the project directory
cd Penny

# Install dependencies
npm install
```

### 3. Run Tests
Penny includes an automated test suite verifying email parsing, OTP filtering, anti-balance logic, duplicate prevention, token encryption, user isolation, and budget math:
```bash
npm test
```
*Result: 17/17 tests passing!*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). The Vite development server automatically proxies all `/api/*` endpoints to the Netlify Functions backend handler, allowing you to test everything locally without installing the Netlify CLI!

To log in immediately without registering, click **One-Click Demo Account (Instant Access)** on the login screen.

### 5. Build for Production
```bash
npm run build
```
Creates an optimized production build in the `dist` folder.

---

## Google Cloud Configuration

To connect live Gmail accounts:
1. Follow the step-by-step instructions in [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md).
2. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in your `.env` or Netlify Dashboard.
3. In testing mode, add your Gmail account to the **Test Users** list in the Google Cloud Console.

---

## Deployment to Netlify

Penny is pre-configured for Netlify with `netlify.toml`:
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Link the repository in the Netlify Dashboard.
3. Configure Build Settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. Set Environment Variables under **Site Configuration** > **Environment variables**:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (e.g. `https://your-site.netlify.app/api/gmail/callback`)
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`
5. Deploy!
