/**
 * Google OAuth2 & Gmail API Client
 * 
 * Strict Read-Only Scope: https://www.googleapis.com/auth/gmail.readonly
 * Never requests or stores passwords.
 * OAuth tokens are encrypted before being saved to storage.
 */

import { encryptData, decryptData } from './crypto.js';

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email';

export function isGoogleOAuthConfigured() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(clientId && clientSecret && clientId.trim() !== '' && clientSecret.trim() !== '');
}

export function getRedirectUri(requestHost) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  // Construct based on host
  const host = requestHost || 'localhost:8888';
  const proto = host.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}/api/gmail/callback`;
}

/**
 * Generates the Google OAuth 2.0 authorization URL.
 */
export function getAuthorizationUrl(userId, requestHost) {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getRedirectUri(requestHost);

  // State parameter to verify user session during callback
  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_READONLY_SCOPE,
    access_type: 'offline', // Requests refresh_token
    prompt: 'consent',      // Ensures refresh_token is returned
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(code, requestHost) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getRedirectUri(requestHost);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code with Google');
  }

  // Also get the user's Google email address for display
  let googleEmail = null;
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      googleEmail = userInfo.email;
    }
  } catch (e) {
    console.error('Could not fetch user email from Google:', e.message);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    googleEmail
  };
}

/**
 * Refreshes an expired access token using stored refresh token.
 */
export async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google access token');
  }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
}

/**
 * Revokes an OAuth token when user disconnects.
 */
export async function revokeToken(token) {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return true;
  } catch (err) {
    console.error('Error revoking token:', err.message);
    return false;
  }
}

/**
 * Fetches Gmail messages matching user's bank senders, label, and date filter.
 */
export async function searchAndFetchGmailMessages(accessToken, options = {}) {
  const { senders = [], label = 'INBOX', dateRange = '30d' } = options;

  // Build Gmail query
  const queryParts = [];

  // Date filter
  if (dateRange === '7d') {
    queryParts.push('newer_than:7d');
  } else if (dateRange === '30d') {
    queryParts.push('newer_than:30d');
  } else if (dateRange === '90d') {
    queryParts.push('newer_than:90d');
  }

  // Label filter
  if (label && label.trim() !== '') {
    queryParts.push(`label:${label.trim()}`);
  }

  // Senders filter
  if (senders && senders.length > 0) {
    const senderQueries = senders.map(s => `from:${s.trim()}`).join(' OR ');
    queryParts.push(`(${senderQueries})`);
  } else {
    // Default broad search for common banking/receipt senders if none specifically selected
    queryParts.push('(from:chase OR from:paypal OR from:stripe OR from:wellsfargo OR from:bankofamerica OR from:americanexpress OR from:apple.com OR from:monzo OR from:revolut OR "receipt" OR "bank alert" OR "statement")');
  }

  const q = queryParts.join(' ');
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=30`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!listRes.ok) {
    const errData = await listRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gmail API search failed with status ${listRes.status}`);
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];

  if (messages.length === 0) {
    return [];
  }

  // Fetch individual message details
  const emailItems = [];

  for (const item of messages) {
    try {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`;
      const msgRes = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!msgRes.ok) continue;

      const msg = await msgRes.json();
      const headers = msg.payload?.headers || [];
      const getHeader = (name) => {
        const found = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return found ? found.value : '';
      };

      const subject = getHeader('Subject');
      const sender = getHeader('From');
      const dateHeader = getHeader('Date');

      // Extract plain text snippet or body
      let bodyText = msg.snippet || '';
      
      // If snippet is short, check payload parts for text/plain
      if (msg.payload?.parts) {
        for (const part of msg.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf8');
            bodyText += `\n${decoded}`;
            break;
          }
        }
      }

      emailItems.push({
        id: item.id,
        sender,
        subject,
        body: bodyText,
        date: dateHeader || parseInt(msg.internalDate, 10)
      });
    } catch (e) {
      console.error(`Failed to process message ${item.id}:`, e.message);
    }
  }

  return emailItems;
}
