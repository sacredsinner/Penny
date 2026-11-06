/**
 * Gmail Transaction Email Rule-Based Parser
 * 
 * Extracts transaction amount, currency, merchant, date, type (expense, income, refund, transfer),
 * and reference number from bank alerts and payment receipts.
 * 
 * Strict filtering ignores:
 * - OTPs / 2FA / Verification codes
 * - Failed or declined payments
 * - Pending authorizations / temporary holds
 * - Marketing promotions
 * - Account balances (distinguished from transaction amount)
 */

// Common currency symbol to ISO code mapping
const CURRENCY_SYMBOLS = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₹': 'INR',
  '¥': 'JPY',
  'A$': 'AUD',
  'C$': 'CAD',
  'AU$': 'AUD',
  'CA$': 'CAD',
  'NZ$': 'NZD'
};

const CATEGORY_KEYWORDS = [
  { category: 'Groceries', words: ["trader joe's", "trader joe", "whole foods", "safeway", "kroger", "aldi", "walmart grocery", "costco", "supermarket", "grocery", "lidl", "woolworths", "coles", "heb", "sprouts", "wegmans"] },
  { category: 'Dining & Food', words: ["starbucks", "mcdonald's", "mcdonalds", "uber eats", "ubereats", "doordash", "grubhub", "deliveroo", "pret", "restaurant", "cafe", "coffee", "bakery", "chipotle", "subway", "taco bell", "wendy's", "dunkin", "burger", "pizza", "sushi", "bar & grill", "diner"] },
  { category: 'Utilities & Bills', words: ["electric", "water utility", "gas utility", "verizon", "at&t", "t-mobile", "sprint", "comcast", "xfinity", "spectrum", "pg&e", "national grid", "con edison", "energy", "internet service", "broadband", "trash", "sewer"] },
  { category: 'Subscriptions & Software', words: ["netflix", "spotify", "apple.com/bill", "apple music", "icloud", "google play", "google storage", "youtube premium", "hulu", "disney+", "disney plus", "hbo max", "openai", "chatgpt", "github", "adobe", "notion", "dropbox", "slack", "figma", "zoom", "patreon", "medium", "nytimes", "prime video"] },
  { category: 'Transport & Fuel', words: ["shell", "chevron", "bp ", "exxon", "mobil", "texaco", "speedway", "circle k", "gas station", "petrol", "uber", "lyft", "bolt", "transit", "metro", "mta", "subway fare", "bart", "parking", "tollway", "ezpass", "fastrak"] },
  { category: 'Shopping', words: ["amazon", "target", "walmart", "best buy", "ebay", "apple store", "nordstrom", "zara", "h&m", "sephora", "nike", "adidas", "etsy", "ikea", "home depot", "lowes", "ulta", "macys", "clothing", "apparel"] },
  { category: 'Health & Fitness', words: ["cvs", "walgreens", "rite aid", "pharmacy", "planet fitness", "equinox", "anytime fitness", "gym", "hospital", "clinic", "dental", "doctor", "optometry", "prescription", "labcorp", "quest diagnostics"] },
  { category: 'Travel', words: ["delta air", "united airlines", "american airlines", "southwest", "jetblue", "airbnb", "booking.com", "expedia", "hotels.com", "marriott", "hilton", "hyatt", "flight", "boarding", "british airways", "ryanair"] },
  { category: 'Income & Salary', words: ["payroll", "direct deposit", "salary", "employer", "stipend", "bonus payment", "dividend"] },
  { category: 'Transfers & Repayments', words: ["credit card payment", "internal transfer", "card payment received", "wire transfer", "transfer to savings", "autopay payment received"] },
  { category: 'Fees & Banking', words: ["overdraft fee", "monthly maintenance fee", "atm fee", "foreign transaction fee", "interest charge"] }
];

export function suggestCategory(merchant, snippet = '') {
  const combined = `${merchant || ''} ${snippet || ''}`.toLowerCase();
  for (const { category, words } of CATEGORY_KEYWORDS) {
    if (words.some(word => combined.includes(word))) {
      return category;
    }
  }
  return 'General';
}

/**
 * Checks if the email is an OTP, 2FA, or verification code.
 */
function isOtpOrSecurityCode(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  const otpPatterns = [
    /\b(verification|security|one-time|authorization)\s+(code|passcode|password|pin)\b/i,
    /\byour\s+(otp|security\s+code|verification\s+code)\s+is\b/i,
    /\buse\s+code\s+\d{4,8}\b/i,
    /\bdo\s+not\s+share\s+this\s+code\b/i,
    /\benter\s+the\s+following\s+code\b/i,
    /\blogin\s+verification\b/i
  ];
  return otpPatterns.some(pattern => pattern.test(text));
}

/**
 * Checks if the payment failed or was declined.
 */
function isFailedOrDeclined(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  const failedPatterns = [
    /\b(payment|transaction|charge|card)\s+(declined|failed|unsuccessful|not\s+approved|rejected)\b/i,
    /\bwas\s+(declined|declined\s+because|rejected)\b/i,
    /\binsufficient\s+funds\b/i,
    /\bcould\s+not\s+process\s+your\s+payment\b/i
  ];
  return failedPatterns.some(pattern => pattern.test(text));
}

/**
 * Checks if this is merely a temporary authorization hold.
 */
function isPendingOrHold(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  const pendingPatterns = [
    /\b(pre-authorization|temporary\s+hold|hold\s+placed\s+on\s+your\s+card|authorization\s+hold)\b/i,
    /\bhold\s+of\s+[$€£\d.]+\s+was\s+placed\b/i
  ];
  return pendingPatterns.some(pattern => pattern.test(text));
}

/**
 * Checks if this is marketing or promotional spam without a transaction.
 */
function isPromotionalWithoutTransaction(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  const promoKeywords = [
    'earn 5% cash back', 'special offer', 'pre-approved', 'apply now', 'credit limit increase',
    'refer a friend', 'save up to', 'exclusive discounts', 'introductory rate', 'rewards update'
  ];
  const hasPromo = promoKeywords.some(kw => text.includes(kw));
  // If it has promo keywords and NO explicit charged/spent/receipt verbs, ignore it
  const hasTransactionVerb = /\b(charged|spent|purchase of|debited|receipt for|paid|sent \$|received \$)\b/i.test(text);
  return hasPromo && !hasTransactionVerb;
}

/**
 * Extracts and cleans reference or authorization number.
 */
function extractReferenceNumber(text) {
  const refPatterns = [
    /(?:transaction\s+id|txn\s+id|reference\s+#?|ref\s+#?|confirmation\s+#?|receipt\s+#?|auth\s+code)[:\s#]*([A-Z0-9-]{6,30})/i,
    /(?:order\s+id|order\s+#)[:\s#]*([A-Z0-9-]{6,30})/i
  ];
  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Distinguishes transaction amount from account balances.
 * We specifically match transaction-action patterns and exclude balance patterns.
 */
function extractTransactionAmountAndCurrency(text) {
  // First, mask out account balance numbers so they cannot be mistakenly matched
  const sanitized = text.replace(
    /(?:available\s+balance|current\s+balance|account\s+balance|ending\s+balance|new\s+balance|balance\s+as\s+of|balance:\s*)\s*[:$€£A-Z]*\s*[\d,]+\.\d{2}/gi,
    ' [BALANCE_MASKED] '
  );

  // Match transaction amounts associated with actions
  const actionPatterns = [
    // "spent $24.50" or "charged $120.00" or "purchase of $85.00" or "payment of $15.00" or "debited by $50.00"
    /(?:spent|charged|debited(?:\s+by)?|purchase(?:\s+of)?|payment(?:\s+of)?|receipt(?:\s+for)?|total(?:\s+paid)?|debit\s+of|amount\s+is|amount:)\s*([$€£₹A-Z]{1,3})?\s*([\d,]+\.\d{2})/i,
    // "sent $45.00 USD" or "received $150.00 USD"
    /(?:sent|received|refund(?:\s+of)?|credited(?:\s+with)?|deposit(?:\s+of)?)\s*([$€£₹A-Z]{1,3})?\s*([\d,]+\.\d{2})/i,
    // "$24.99 at TRADER JOE'S"
    /([$€£₹A-Z]{1,3})\s*([\d,]+\.\d{2})\s+(?:at|to|from)\s+[A-Za-z0-9]/i,
    // "12.99 USD to Spotify"
    /([\d,]+\.\d{2})\s*(USD|EUR|GBP|AUD|CAD)\s+(?:to|at|from)\b/i
  ];

  for (const pattern of actionPatterns) {
    const match = sanitized.match(pattern);
    if (match) {
      let rawCurrency = null;
      let rawAmount = null;

      if (pattern.source.includes('(USD|EUR|GBP|AUD|CAD)')) {
        rawAmount = match[1];
        rawCurrency = match[2];
      } else {
        rawCurrency = match[1];
        rawAmount = match[2];
      }

      const amount = parseFloat(rawAmount.replace(/,/g, ''));
      if (isNaN(amount) || amount <= 0) continue;

      let currency = 'USD';
      if (rawCurrency) {
        rawCurrency = rawCurrency.trim();
        if (CURRENCY_SYMBOLS[rawCurrency]) {
          currency = CURRENCY_SYMBOLS[rawCurrency];
        } else if (rawCurrency.length === 3) {
          currency = rawCurrency.toUpperCase();
        }
      }

      // Check if text specifies USD/EUR/GBP explicitly right after amount
      const currencyAfter = sanitized.slice(match.index, match.index + 50).match(/\b(USD|EUR|GBP|AUD|CAD|INR)\b/i);
      if (currencyAfter) {
        currency = currencyAfter[1].toUpperCase();
      }

      return { amount, currency };
    }
  }

  // Fallback pattern: simple amount with symbol if preceded by transaction context
  const fallbackMatch = sanitized.match(/([$€£₹])\s*([\d,]+\.\d{2})/);
  if (fallbackMatch) {
    const sym = fallbackMatch[1];
    const amount = parseFloat(fallbackMatch[2].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      return {
        amount,
        currency: CURRENCY_SYMBOLS[sym] || 'USD'
      };
    }
  }

  return null;
}

/**
 * Classifies transaction type: expense, income, refund, transfer.
 */
function classifyType(text) {
  const lower = text.toLowerCase();

  // Refunds first
  if (/\b(refund|refunded|credit\s+adjustment|reversed|reversal)\b/i.test(lower)) {
    return 'refund';
  }

  // Transfers
  if (/\b(transfer\s+to\s+savings|internal\s+transfer|wire\s+transfer|payment\s+to\s+credit\s+card|card\s+payment\s+received|between\s+your\s+accounts)\b/i.test(lower)) {
    return 'transfer';
  }

  // Income
  if (/\b(direct\s+deposit|payroll|salary|deposit\s+posted|credited\s+with|received\s+[$€£\d.]+\s+from|payment\s+received\s+from)\b/i.test(lower)) {
    return 'income';
  }

  // Default is expense
  return 'expense';
}

/**
 * Extracts merchant or payee from text.
 */
function extractMerchant(text, sender) {
  // Known sender overrides
  const senderLower = (sender || '').toLowerCase();
  if (senderLower.includes('apple.com') || text.includes('Apple.com/bill') || text.includes('receipt from Apple')) {
    // Check if it specifies service
    if (text.toLowerCase().includes('icloud')) return 'Apple iCloud';
    if (text.toLowerCase().includes('apple music')) return 'Apple Music';
    return 'Apple';
  }
  if (senderLower.includes('paypal')) {
    const ppMatch = text.match(/(?:sent\s+(?:a\s+)?payment\s+of\s+[$€£\d.]+(?:\s+[A-Z]{3})?\s+to|sent\s+[$€£\d.]+(?:\s+[A-Z]{3})?\s+to|payment\s+(?:of\s+[$€£\d.]+(?:\s+[A-Z]{3})?\s+)?to)\s+([A-Za-z0-9\s.,'&_-]{2,35})(?:\.|\n|\r|$)/i);
    if (ppMatch) return ppMatch[1].trim();
  }
  if (senderLower.includes('stripe')) {
    const stripeMatch = text.match(/(?:receipt\s+from|paid\s+[$€£\d.]+\s+to)\s+([A-Za-z0-9\s.,'&_-]{2,35})/i);
    if (stripeMatch) return stripeMatch[1].trim();
  }

  // General regex for "at <Merchant>" or "to <Merchant>"
  const merchantPatterns = [
    /(?:at|to)\s+([A-Z0-9\s&'.-]{2,35})\s+(?:on|using|with|via|\.|\n|$)/i,
    /(?:purchase of\s+[$€£\d.]+\s+at)\s+([A-Za-z0-9\s&'.-]{2,35})/i,
    /(?:receipt\s+from)\s+([A-Za-z0-9\s&'.-]{2,35})/i,
    /(?:paid\s+to)\s+([A-Za-z0-9\s&'.-]{2,35})/i
  ];

  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const raw = match[1].trim()
        .replace(/\s+/g, ' ')
        .replace(/\b(card ending|on\s+\w+|your account)\b.*$/i, '')
        .trim();
      if (raw.length > 1 && !/^(the|a|an|your|my)$/i.test(raw)) {
        return raw;
      }
    }
  }

  // Fallback: derive from sender domain
  if (sender) {
    const domainMatch = sender.match(/@([a-zA-Z0-9.-]+)/);
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase();
      if (domain.includes('chase')) return 'Chase';
      if (domain.includes('bankofamerica')) return 'Bank of America';
      if (domain.includes('wellsfargo')) return 'Wells Fargo';
      if (domain.includes('americanexpress')) return 'American Express';
      if (domain.includes('capitalone')) return 'Capital One';
      if (domain.includes('paypal')) return 'PayPal';
      if (domain.includes('stripe')) return 'Stripe Merchant';
      if (domain.includes('monzo')) return 'Monzo';
      if (domain.includes('revolut')) return 'Revolut';
      return domain.split('.')[0].toUpperCase();
    }
  }

  return 'Unknown Merchant';
}

/**
 * Extracts transaction date from email text, falling back to message internal date.
 */
function extractDate(text, messageDate) {
  // Matches "Nov 2, 2026", "November 2, 2026", "11/02/2026", "2026-11-02", "02-11-2026"
  const datePatterns = [
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i,
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
    /\b(\d{4})-(\d{2})-(\d{2})\b/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = new Date(match[0]);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      } catch {
        // continue
      }
    }
  }

  if (messageDate) {
    try {
      const parsed = new Date(messageDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {
      // continue
    }
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Main parser entry point.
 * 
 * @param {Object} emailMessage
 * @param {string} emailMessage.id - Gmail message ID
 * @param {string} emailMessage.sender - From header
 * @param {string} emailMessage.subject - Subject line
 * @param {string} emailMessage.body - Sanitized text body/snippet
 * @param {string|number} emailMessage.date - Message internal date/header
 * 
 * @returns {Object|null} Parsed transaction object or null if ignored
 */
export function parseEmailToTransaction(emailMessage) {
  const { id: gmailMessageId, sender = '', subject = '', body = '', date: rawDate } = emailMessage;
  const combinedText = `${subject}\n${body}`;

  // 1. Strict Exclusion Checks
  if (isOtpOrSecurityCode(subject, body)) {
    return null; // Ignore OTPs & 2FA codes
  }

  if (isFailedOrDeclined(subject, body)) {
    return null; // Ignore failed or declined payments
  }

  if (isPendingOrHold(subject, body)) {
    return null; // Ignore temporary pre-authorization holds
  }

  if (isPromotionalWithoutTransaction(subject, body)) {
    return null; // Ignore marketing emails without transaction
  }

  // 2. Extract Transaction Amount & Currency (carefully excluding account balances)
  const amountInfo = extractTransactionAmountAndCurrency(combinedText);
  if (!amountInfo || amountInfo.amount <= 0) {
    // If no transaction amount found, ignore email
    return null;
  }

  // 3. Classify Type: expense, income, refund, transfer
  const type = classifyType(combinedText);

  // 4. Extract Merchant / Payee
  const merchant = extractMerchant(combinedText, sender);

  // 5. Extract Reference / Authorization number
  const referenceNumber = extractReferenceNumber(combinedText);

  // 6. Extract Transaction Date
  const date = extractDate(combinedText, rawDate);

  // 7. Auto-suggest category
  const category = suggestCategory(merchant, combinedText);

  // 8. Confidence calculation
  const isGenericMerchant = /\bbank\b|unknown|pos debit|debit notice|card debit|atm debit|^[a-z0-9]*bank/i.test(merchant);
  let confidenceScore = 100;
  if (merchant === 'Unknown Merchant' || isGenericMerchant) confidenceScore -= 30;
  if (!referenceNumber) confidenceScore -= 10;
  if (type === 'transfer' || type === 'refund') confidenceScore -= 10;

  // Route uncertain matches to review queue
  const status = confidenceScore >= 75 ? 'confirmed' : 'needs_review';

  return {
    gmailMessageId: gmailMessageId || null,
    amount: amountInfo.amount,
    currency: amountInfo.currency,
    merchant,
    date,
    type,
    category,
    status,
    referenceNumber,
    isPossibleDuplicate: false,
    rawSubject: subject.slice(0, 120), // sanitized short subject for review context
    notes: `Imported via email alert: ${subject.slice(0, 60)}`
  };
}
