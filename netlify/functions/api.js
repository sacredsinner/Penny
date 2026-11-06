import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteUserTransactions,
  batchCreateTransactions,
  getGoal,
  saveGoal
} from './utils/db.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateRequest
} from './utils/auth.js';
import {
  encryptData,
  decryptData
} from './utils/crypto.js';
import {
  parseEmailToTransaction,
  suggestCategory
} from './utils/gmailParser.js';
import {
  isGoogleOAuthConfigured,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  searchAndFetchGmailMessages
} from './utils/googleClient.js';
import {
  calculateGoalMetrics,
  aggregateReports
} from './utils/budgetCalculations.js';

// Realistic mock email samples for Demo Mode (clearly labeled Demo Data)
const SAMPLE_MOCK_EMAILS = [
  {
    id: 'mock_chase_01',
    sender: 'no-reply@alertspbx.chase.com',
    subject: 'Your debit card was used for $48.25 at TRADER JOE\'S',
    body: 'Account ending in 4102. Your debit card was used for $48.25 at TRADER JOE\'S on Nov 3, 2026. Ref #CH-8829103. Note: Available Balance: $3,210.45.',
    date: '2026-11-03T14:20:00Z'
  },
  {
    id: 'mock_paypal_01',
    sender: 'service@paypal.com',
    subject: 'Receipt for your payment of $14.99 USD to Spotify',
    body: 'You sent a payment of $14.99 USD to Spotify AB. Transaction ID: 8PJ902341829. Payment method: PayPal balance. Balance remaining: $120.00.',
    date: '2026-11-02T08:15:00Z'
  },
  {
    id: 'mock_stripe_01',
    sender: 'receipts@stripe.com',
    subject: 'Receipt from GitHub for $10.00',
    body: 'Receipt #GH-100293. Amount paid: $10.00 USD. Paid with Visa ending in 4102 to GitHub Copilot Subscription.',
    date: '2026-11-01T12:00:00Z'
  },
  {
    id: 'mock_apple_01',
    sender: 'no_reply@email.apple.com',
    subject: 'Your receipt from Apple for $2.99',
    body: 'Your receipt from Apple: $2.99 for iCloud+ 200GB Storage Plan. Order ID: MN998231. Billed to card ending in 4102.',
    date: '2026-10-30T10:45:00Z'
  },
  {
    id: 'mock_chase_salary',
    sender: 'no-reply@alertspbx.chase.com',
    subject: 'Direct deposit of $3,500.00 credited to checking',
    body: 'Direct deposit of $3,500.00 from ACME TECH CORP was credited to your checking account on Oct 30, 2026. Ref #PAYROLL-99201.',
    date: '2026-10-30T06:00:00Z'
  },
  {
    id: 'mock_refund_01',
    sender: 'service@paypal.com',
    subject: 'Refund from Target Stores for $34.50 USD',
    body: 'Target Stores has issued a refund of $34.50 USD to your account for Order #TGT-44910. Transaction ID: REF-990214.',
    date: '2026-10-28T16:10:00Z'
  },
  {
    id: 'mock_transfer_01',
    sender: 'alerts@chase.com',
    subject: 'Transfer of $500.00 to Savings Account',
    body: 'Automatic internal transfer of $500.00 between your accounts was completed on Oct 25, 2026. Ref #TRF-11029.',
    date: '2026-10-25T11:00:00Z'
  },
  {
    id: 'mock_ambiguous_01',
    sender: 'alerts@bank.com',
    subject: 'Card Debit Alert',
    body: 'A debit of $32.00 was recorded on your card. Location: POS DEBIT 99401. Ref: 48190.',
    date: '2026-10-24T18:30:00Z'
  },
  // Items that MUST be ignored by rule-based parser:
  {
    id: 'mock_otp_01',
    sender: 'security@chase.com',
    subject: 'Your one-time security code is 849201',
    body: 'Use code 849201 to verify your identity. Do not share this code with anyone.',
    date: '2026-11-04T09:00:00Z'
  },
  {
    id: 'mock_declined_01',
    sender: 'alerts@wellsfargo.com',
    subject: 'Transaction Declined at Best Buy',
    body: 'A transaction of $499.00 was declined because insufficient funds were available on your card.',
    date: '2026-11-04T10:00:00Z'
  },
  {
    id: 'mock_hold_01',
    sender: 'alerts@chase.com',
    subject: 'Pre-authorization hold at Shell Gas',
    body: 'A temporary hold of $1.00 was placed on your card at Shell Gas Station.',
    date: '2026-11-04T11:00:00Z'
  }
];

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }

  // Normalize path
  let path = event.path || '';
  if (path.startsWith('/.netlify/functions/api')) {
    path = path.replace('/.netlify/functions/api', '/api');
  }
  const method = event.httpMethod.toUpperCase();
  const headers = event.headers || {};
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      body = {};
    }
  }
  const query = event.queryStringParameters || {};

  // Host header for OAuth redirects
  const host = headers.host || headers.Host || 'localhost:8888';

  try {
    // ==========================================
    // PUBLIC AUTH ROUTES
    // ==========================================

    if (method === 'POST' && path === '/api/auth/register') {
      const { email, password, name } = body;
      if (!email || !password || password.length < 6) {
        return jsonResponse(400, { error: 'Valid email and password (min 6 characters) are required.' });
      }

      const existing = findUserByEmail(email);
      if (existing) {
        return jsonResponse(409, { error: 'An account with this email already exists. Please log in.' });
      }

      const passwordHash = await hashPassword(password);
      const user = createUser({ email, passwordHash, name });
      const token = generateToken(user);

      return jsonResponse(201, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          gmailConfig: {
            isConnected: user.gmailConfig?.isConnected || false,
            email: user.gmailConfig?.email || null,
            lastSync: user.gmailConfig?.lastSync || null
          }
        }
      });
    }

    if (method === 'POST' && path === '/api/auth/login') {
      const { email, password } = body;
      if (!email || !password) {
        return jsonResponse(400, { error: 'Email and password are required.' });
      }

      const user = findUserByEmail(email);
      if (!user) {
        return jsonResponse(401, { error: 'Invalid email or password.' });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return jsonResponse(401, { error: 'Invalid email or password.' });
      }

      const token = generateToken(user);
      return jsonResponse(200, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          gmailConfig: {
            isConnected: user.gmailConfig?.isConnected || false,
            email: user.gmailConfig?.email || null,
            lastSync: user.gmailConfig?.lastSync || null
          }
        }
      });
    }

    // ==========================================
    // AUTHENTICATED ROUTES
    // (Enforce User Ownership On Every Request)
    // ==========================================

    const { user, error: authError } = authenticateRequest(headers);
    if (authError || !user) {
      return jsonResponse(401, { error: authError || 'Unauthorized access' });
    }

    // GET /api/auth/me
    if (method === 'GET' && path === '/api/auth/me') {
      return jsonResponse(200, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          gmailConfig: {
            isConnected: user.gmailConfig?.isConnected || false,
            email: user.gmailConfig?.email || null,
            lastSync: user.gmailConfig?.lastSync || null,
            senders: user.gmailConfig?.senders || [],
            label: user.gmailConfig?.label || 'INBOX',
            dateRange: user.gmailConfig?.dateRange || '30d'
          }
        }
      });
    }

    // ==========================================
    // GMAIL INTEGRATION ROUTES
    // ==========================================

    // GET /api/gmail/status
    if (method === 'GET' && path === '/api/gmail/status') {
      const isOAuthConfigured = isGoogleOAuthConfigured();
      return jsonResponse(200, {
        oauthConfigured: isOAuthConfigured,
        isConnected: Boolean(user.gmailConfig?.isConnected),
        connectedEmail: user.gmailConfig?.email || null,
        lastSync: user.gmailConfig?.lastSync || null,
        senders: user.gmailConfig?.senders || [],
        label: user.gmailConfig?.label || 'INBOX',
        dateRange: user.gmailConfig?.dateRange || '30d',
        setupDocumentation: {
          docsUrl: '/GOOGLE_CLOUD_SETUP.md',
          notes: 'Google Cloud OAuth credentials must be set in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Testing users must be whitelisted in Google Cloud Console while app is Unverified.'
        }
      });
    }

    // GET /api/gmail/auth-url
    if (method === 'GET' && path === '/api/gmail/auth-url') {
      if (!isGoogleOAuthConfigured()) {
        return jsonResponse(400, {
          error: 'Google Cloud credentials are not configured.',
          configured: false,
          instructions: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Netlify environment variables.'
        });
      }

      try {
        const authUrl = getAuthorizationUrl(user.id, host);
        return jsonResponse(200, { authUrl });
      } catch (err) {
        return jsonResponse(500, { error: err.message });
      }
    }

    // POST /api/gmail/callback
    if (method === 'POST' && path === '/api/gmail/callback') {
      const { code } = body;
      if (!code) {
        return jsonResponse(400, { error: 'Authorization code is required' });
      }

      try {
        const tokens = await exchangeCodeForTokens(code, host);
        // Encrypt tokens before storing
        const encryptedTokens = encryptData({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt
        });

        const updatedUser = updateUser(user.id, {
          gmailConfig: {
            ...user.gmailConfig,
            isConnected: true,
            email: tokens.googleEmail || user.email,
            tokensEncrypted: encryptedTokens
          }
        });

        return jsonResponse(200, {
          success: true,
          message: 'Gmail successfully connected with read-only permissions.',
          connectedEmail: updatedUser.gmailConfig.email
        });
      } catch (err) {
        return jsonResponse(500, { error: `Google OAuth error: ${err.message}` });
      }
    }

    // POST /api/gmail/config
    if (method === 'POST' && path === '/api/gmail/config') {
      const { senders, label, dateRange } = body;
      const updatedUser = updateUser(user.id, {
        gmailConfig: {
          ...user.gmailConfig,
          senders: Array.isArray(senders) ? senders : user.gmailConfig?.senders || [],
          label: label !== undefined ? String(label).trim() : user.gmailConfig?.label || 'INBOX',
          dateRange: dateRange || user.gmailConfig?.dateRange || '30d'
        }
      });

      return jsonResponse(200, {
        success: true,
        gmailConfig: {
          isConnected: updatedUser.gmailConfig.isConnected,
          email: updatedUser.gmailConfig.email,
          senders: updatedUser.gmailConfig.senders,
          label: updatedUser.gmailConfig.label,
          dateRange: updatedUser.gmailConfig.dateRange
        }
      });
    }

    // POST /api/sms/sync
    if (method === 'POST' && path === '/api/sms/sync') {
      const { messages = [] } = body;
      const parsedTxs = [];
      let ignoredCount = 0;

      for (const sms of messages) {
        const emailLike = {
          id: sms.id ? `sms_${sms.id}` : `sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          sender: sms.sender || 'SMS Alert',
          subject: `SMS from ${sms.sender || 'Bank'}`,
          body: sms.body || '',
          date: sms.date || Date.now()
        };

        const parsed = parseEmailToTransaction(emailLike);
        if (parsed) {
          parsed.source = 'sms';
          parsed.notes = `Imported via SMS from ${sms.sender || 'Bank'}`;
          parsedTxs.push(parsed);
        } else {
          ignoredCount++;
        }
      }

      const imported = batchCreateTransactions(user.id, parsedTxs);

      return jsonResponse(200, {
        success: true,
        scanned: messages.length,
        imported: imported.length,
        ignored: ignoredCount,
        message: `Processed ${messages.length} SMS alerts, imported ${imported.length} new transactions.`
      });
    }

    // POST /api/gmail/sync
    if (method === 'POST' && path === '/api/gmail/sync') {
      if (!user.gmailConfig?.isConnected || !user.gmailConfig?.tokensEncrypted) {
        return jsonResponse(400, { error: 'Gmail is not connected. Connect Gmail first or use Demo Sync.' });
      }

      const tokens = decryptData(user.gmailConfig.tokensEncrypted);
      if (!tokens) {
        return jsonResponse(400, { error: 'Stored Gmail credentials could not be decrypted. Please reconnect Gmail.' });
      }

      let accessToken = tokens.accessToken;
      // Refresh token if near expiration (within 2 minutes)
      if (Date.now() > (tokens.expiresAt - 120000)) {
        if (!tokens.refreshToken) {
          return jsonResponse(401, { error: 'Google session expired and no refresh token found. Please reconnect Gmail.' });
        }
        try {
          const refreshed = await refreshAccessToken(tokens.refreshToken);
          accessToken = refreshed.accessToken;
          tokens.accessToken = refreshed.accessToken;
          tokens.expiresAt = refreshed.expiresAt;
          updateUser(user.id, {
            gmailConfig: {
              ...user.gmailConfig,
              tokensEncrypted: encryptData(tokens)
            }
          });
        } catch (refreshErr) {
          return jsonResponse(401, { error: `Failed to refresh Google session: ${refreshErr.message}. Please reconnect Gmail.` });
        }
      }

      try {
        // Fetch matching emails using user's configured senders, label, and dateRange
        const rawEmails = await searchAndFetchGmailMessages(accessToken, {
          senders: user.gmailConfig.senders,
          label: user.gmailConfig.label,
          dateRange: user.gmailConfig.dateRange
        });

        // Parse each email through rule-based parser
        const parsedTxs = [];
        let ignoredCount = 0;

        for (const email of rawEmails) {
          const parsed = parseEmailToTransaction(email);
          if (parsed) {
            parsed.source = 'gmail';
            parsedTxs.push(parsed);
          } else {
            ignoredCount++;
          }
        }

        // Batch create with duplicate detection (gmailMessageId, referenceNumber, fuzzy matches)
        const imported = batchCreateTransactions(user.id, parsedTxs);

        // Update lastSync timestamp
        updateUser(user.id, {
          gmailConfig: {
            ...user.gmailConfig,
            lastSync: new Date().toISOString()
          }
        });

        return jsonResponse(200, {
          success: true,
          emailsScanned: rawEmails.length,
          transactionsImported: imported.length,
          ignoredEmails: ignoredCount,
          lastSync: new Date().toISOString()
        });
      } catch (syncErr) {
        return jsonResponse(500, { error: `Gmail sync failed: ${syncErr.message}` });
      }
    }

    // POST /api/gmail/mock-sync (Demo Mode)
    if (method === 'POST' && path === '/api/gmail/mock-sync') {
      const parsedTxs = [];
      let ignoredCount = 0;

      for (const email of SAMPLE_MOCK_EMAILS) {
        const parsed = parseEmailToTransaction(email);
        if (parsed) {
          parsed.source = 'demo';
          parsedTxs.push(parsed);
        } else {
          ignoredCount++;
        }
      }

      const imported = batchCreateTransactions(user.id, parsedTxs);

      return jsonResponse(200, {
        success: true,
        isDemoData: true,
        emailsScanned: SAMPLE_MOCK_EMAILS.length,
        transactionsImported: imported.length,
        ignoredEmails: ignoredCount,
        message: 'Demo bank alerts parsed and imported! All demo records are clearly labeled.'
      });
    }

    // POST /api/gmail/disconnect
    if (method === 'POST' && path === '/api/gmail/disconnect') {
      if (user.gmailConfig?.tokensEncrypted) {
        const tokens = decryptData(user.gmailConfig.tokensEncrypted);
        if (tokens?.accessToken) {
          await revokeToken(tokens.accessToken);
        }
      }

      updateUser(user.id, {
        gmailConfig: {
          isConnected: false,
          email: null,
          lastSync: null,
          senders: [],
          label: 'INBOX',
          dateRange: '30d',
          tokensEncrypted: null
        }
      });

      return jsonResponse(200, {
        success: true,
        message: 'Gmail disconnected and stored tokens revoked.'
      });
    }

    // POST /api/gmail/delete-data
    if (method === 'POST' && path === '/api/gmail/delete-data') {
      const { sourceOnly } = body;
      const count = deleteUserTransactions(user.id, { sourceOnly: sourceOnly || null });
      return jsonResponse(200, {
        success: true,
        deletedCount: count,
        message: `Deleted ${count} transactions.`
      });
    }

    // ==========================================
    // TRANSACTION MANAGEMENT ROUTES
    // ==========================================

    // GET /api/transactions
    if (method === 'GET' && path === '/api/transactions') {
      const txs = getTransactions(user.id, query);
      return jsonResponse(200, { transactions: txs });
    }

    // POST /api/transactions
    if (method === 'POST' && path === '/api/transactions') {
      const { amount, currency, merchant, date, type, category, referenceNumber, notes } = body;
      if (!amount || isNaN(parseFloat(amount))) {
        return jsonResponse(400, { error: 'Valid amount is required.' });
      }

      const autoCategory = category || suggestCategory(merchant, notes);
      const newTx = createTransaction(user.id, {
        amount,
        currency: currency || 'USD',
        merchant: merchant || 'Manual Entry',
        date: date || new Date().toISOString().split('T')[0],
        type: type || 'expense',
        category: autoCategory,
        status: 'confirmed',
        referenceNumber,
        notes,
        source: 'manual'
      });

      return jsonResponse(201, { transaction: newTx });
    }

    // PUT /api/transactions/:id
    if (method === 'PUT' && path.startsWith('/api/transactions/')) {
      const txId = path.split('/')[3];
      const updated = updateTransaction(user.id, txId, body);
      if (!updated) {
        return jsonResponse(404, { error: 'Transaction not found or permission denied.' });
      }
      return jsonResponse(200, { transaction: updated });
    }

    // POST /api/transactions/:id/approve
    if (method === 'POST' && path.includes('/approve')) {
      const txId = path.split('/')[3];
      const updated = updateTransaction(user.id, txId, {
        status: 'confirmed',
        isPossibleDuplicate: false
      });
      if (!updated) {
        return jsonResponse(404, { error: 'Transaction not found or permission denied.' });
      }
      return jsonResponse(200, { transaction: updated });
    }

    // DELETE /api/transactions/:id
    if (method === 'DELETE' && path.startsWith('/api/transactions/')) {
      const txId = path.split('/')[3];
      const deleted = deleteTransaction(user.id, txId);
      if (!deleted) {
        return jsonResponse(404, { error: 'Transaction not found or permission denied.' });
      }
      return jsonResponse(200, { success: true, message: 'Transaction deleted.' });
    }

    // ==========================================
    // REPORTS & BUDGET GOALS ROUTES
    // ==========================================

    // GET /api/reports
    if (method === 'GET' && path === '/api/reports') {
      const txs = getTransactions(user.id);
      const reports = aggregateReports(txs);
      return jsonResponse(200, {
        reports,
        disclaimer: 'Reports reflect imported emails and manually logged transactions. Unlinked accounts, cash transactions, or unparsed emails may not be included.'
      });
    }

    // GET /api/budget-goals
    if (method === 'GET' && path === '/api/budget-goals') {
      const goal = getGoal(user.id) || {
        monthlyIncome: 0,
        essentialExpenses: 0,
        savingsTarget: 0,
        currentSavings: 0,
        deadline: null,
        categoryLimits: {}
      };

      const txs = getTransactions(user.id);
      const metrics = calculateGoalMetrics(goal, txs);

      return jsonResponse(200, { goal: metrics });
    }

    // POST /api/budget-goals
    if (method === 'POST' && path === '/api/budget-goals') {
      const saved = saveGoal(user.id, body);
      const txs = getTransactions(user.id);
      const metrics = calculateGoalMetrics(saved, txs);
      return jsonResponse(200, {
        success: true,
        goal: metrics
      });
    }

    return jsonResponse(404, { error: `Endpoint not found: ${method} ${path}` });
  } catch (err) {
    console.error('API Error:', err);
    return jsonResponse(500, { error: `Internal Server Error: ${err.message}` });
  }
}
