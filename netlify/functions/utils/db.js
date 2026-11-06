import fs from 'fs';
import path from 'path';

// Store data in a persistent directory.
// On Netlify serverless, /tmp is writable across warm invocations.
// Locally or in custom environments, we store in project's .data folder.
function getDbFilePath() {
  if (process.env.STORAGE_FILE_PATH) {
    return process.env.STORAGE_FILE_PATH;
  }
  const isNetlifyLambda = Boolean(process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV);
  const baseDir = isNetlifyLambda ? '/tmp' : path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch {
      // directory might already exist
    }
  }
  return path.join(baseDir, 'penny_db.json');
}

const DB_FILE = getDbFilePath();

function getInitialData() {
  return {
    users: [],
    transactions: [],
    goals: []
  };
}

let memoryCache = null;

function readDb() {
  if (memoryCache) {
    return memoryCache;
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      memoryCache = JSON.parse(content);
      return memoryCache;
    }
  } catch (err) {
    console.error('Error reading DB, initializing new:', err.message);
  }
  memoryCache = getInitialData();
  writeDb(memoryCache);
  return memoryCache;
}

function writeDb(data) {
  memoryCache = data;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing DB file:', err.message);
  }
}

// User Methods
export function findUserByEmail(email) {
  if (!email) return null;
  const db = readDb();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
}

export function findUserById(id) {
  if (!id) return null;
  const db = readDb();
  return db.users.find(u => u.id === id) || null;
}

export function createUser(userData) {
  const db = readDb();
  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: userData.email.toLowerCase().trim(),
    passwordHash: userData.passwordHash,
    name: userData.name || userData.email.split('@')[0],
    createdAt: new Date().toISOString(),
    gmailConfig: {
      isConnected: false,
      email: null,
      lastSync: null,
      senders: [],
      label: 'INBOX',
      dateRange: '30d',
      tokensEncrypted: null
    }
  };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

export function updateUser(id, updates) {
  const db = readDb();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return null;

  db.users[index] = {
    ...db.users[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
  return db.users[index];
}

export function deleteUser(id) {
  const db = readDb();
  db.users = db.users.filter(u => u.id !== id);
  db.transactions = db.transactions.filter(t => t.userId !== id);
  db.goals = db.goals.filter(g => g.userId !== id);
  writeDb(db);
  return true;
}

// Transaction Methods (Strict User Ownership Enforced)
export function getTransactions(userId, filters = {}) {
  const db = readDb();
  // Filter strictly by userId
  let userTxs = db.transactions.filter(t => t.userId === userId);

  if (filters.status) {
    userTxs = userTxs.filter(t => t.status === filters.status);
  }
  if (filters.category) {
    userTxs = userTxs.filter(t => t.category === filters.category);
  }
  if (filters.type) {
    userTxs = userTxs.filter(t => t.type === filters.type);
  }
  if (filters.currency) {
    userTxs = userTxs.filter(t => t.currency === filters.currency.toUpperCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    userTxs = userTxs.filter(t =>
      (t.merchant && t.merchant.toLowerCase().includes(q)) ||
      (t.referenceNumber && t.referenceNumber.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  }
  if (filters.startDate) {
    userTxs = userTxs.filter(t => new Date(t.date) >= new Date(filters.startDate));
  }
  if (filters.endDate) {
    userTxs = userTxs.filter(t => new Date(t.date) <= new Date(filters.endDate));
  }

  // Sort descending by date
  return userTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getTransactionById(userId, txId) {
  const db = readDb();
  // Strict user ownership check
  return db.transactions.find(t => t.id === txId && t.userId === userId) || null;
}

export function createTransaction(userId, txData) {
  const db = readDb();
  const newTx = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    amount: parseFloat(txData.amount) || 0,
    currency: (txData.currency || 'USD').toUpperCase(),
    merchant: txData.merchant ? String(txData.merchant).trim() : 'Unknown Merchant',
    date: txData.date || new Date().toISOString().split('T')[0],
    type: ['expense', 'income', 'refund', 'transfer'].includes(txData.type) ? txData.type : 'expense',
    category: txData.category || 'General',
    status: txData.status === 'needs_review' ? 'needs_review' : 'confirmed',
    referenceNumber: txData.referenceNumber || null,
    gmailMessageId: txData.gmailMessageId || null,
    source: txData.source || 'manual', // 'gmail' | 'manual' | 'demo'
    isPossibleDuplicate: Boolean(txData.isPossibleDuplicate),
    notes: txData.notes || '',
    rawSubject: txData.rawSubject || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.transactions.push(newTx);
  writeDb(db);
  return newTx;
}

export function updateTransaction(userId, txId, updates) {
  const db = readDb();
  const index = db.transactions.findIndex(t => t.id === txId && t.userId === userId);
  if (index === -1) return null;

  const current = db.transactions[index];
  const updated = {
    ...current,
    ...updates,
    amount: updates.amount !== undefined ? parseFloat(updates.amount) : current.amount,
    currency: updates.currency ? updates.currency.toUpperCase() : current.currency,
    updatedAt: new Date().toISOString()
  };

  db.transactions[index] = updated;
  writeDb(db);
  return updated;
}

export function deleteTransaction(userId, txId) {
  const db = readDb();
  const index = db.transactions.findIndex(t => t.id === txId && t.userId === userId);
  if (index === -1) return false;

  db.transactions.splice(index, 1);
  writeDb(db);
  return true;
}

export function deleteUserTransactions(userId, options = {}) {
  const db = readDb();
  const initialCount = db.transactions.length;
  
  if (options.sourceOnly) {
    db.transactions = db.transactions.filter(t => !(t.userId === userId && t.source === options.sourceOnly));
  } else {
    db.transactions = db.transactions.filter(t => t.userId !== userId);
  }
  
  writeDb(db);
  return initialCount - db.transactions.length;
}

export function batchCreateTransactions(userId, txsList) {
  const db = readDb();
  const created = [];

  for (const txData of txsList) {
    // Check for exact duplicate by gmailMessageId
    if (txData.gmailMessageId) {
      const exists = db.transactions.some(t => t.userId === userId && t.gmailMessageId === txData.gmailMessageId);
      if (exists) continue;
    }

    // Check for duplicate by referenceNumber
    if (txData.referenceNumber) {
      const refExists = db.transactions.some(t => t.userId === userId && t.referenceNumber === txData.referenceNumber);
      if (refExists) continue;
    }

    // Check for possible duplicate (same date, same amount, same currency, similar merchant)
    let isPossibleDuplicate = false;
    const fuzzyMatch = db.transactions.some(t =>
      t.userId === userId &&
      t.date === txData.date &&
      Math.abs(t.amount - txData.amount) < 0.01 &&
      t.currency === (txData.currency || 'USD').toUpperCase() &&
      t.merchant.toLowerCase() === (txData.merchant || '').toLowerCase()
    );

    if (fuzzyMatch) {
      isPossibleDuplicate = true;
    }

    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${Math.floor(Math.random() * 1000)}`,
      userId,
      amount: parseFloat(txData.amount) || 0,
      currency: (txData.currency || 'USD').toUpperCase(),
      merchant: txData.merchant ? String(txData.merchant).trim() : 'Unknown Merchant',
      date: txData.date || new Date().toISOString().split('T')[0],
      type: ['expense', 'income', 'refund', 'transfer'].includes(txData.type) ? txData.type : 'expense',
      category: txData.category || 'General',
      status: (isPossibleDuplicate || txData.status === 'needs_review') ? 'needs_review' : 'confirmed',
      referenceNumber: txData.referenceNumber || null,
      gmailMessageId: txData.gmailMessageId || null,
      source: txData.source || 'gmail',
      isPossibleDuplicate,
      notes: txData.notes || (isPossibleDuplicate ? 'Possible duplicate transaction detected' : ''),
      rawSubject: txData.rawSubject || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.transactions.push(newTx);
    created.push(newTx);
  }

  writeDb(db);
  return created;
}

// Goals Methods (Strict User Ownership Enforced)
export function getGoal(userId) {
  const db = readDb();
  return db.goals.find(g => g.userId === userId) || null;
}

export function saveGoal(userId, goalData) {
  const db = readDb();
  const index = db.goals.findIndex(g => g.userId === userId);
  const now = new Date().toISOString();

  const record = {
    userId,
    monthlyIncome: parseFloat(goalData.monthlyIncome) || 0,
    essentialExpenses: parseFloat(goalData.essentialExpenses) || 0,
    savingsTarget: parseFloat(goalData.savingsTarget) || 0,
    currentSavings: parseFloat(goalData.currentSavings) || 0,
    deadline: goalData.deadline || null,
    categoryLimits: goalData.categoryLimits || {},
    updatedAt: now
  };

  if (index === -1) {
    record.createdAt = now;
    db.goals.push(record);
  } else {
    db.goals[index] = { ...db.goals[index], ...record };
  }

  writeDb(db);
  return record;
}
