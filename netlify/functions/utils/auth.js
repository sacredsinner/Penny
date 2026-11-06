import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserById, findUserByEmail, createUser } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'penny-secure-jwt-secret-key-1234567890';
const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword, hash) {
  return await bcrypt.compare(plainPassword, hash);
}

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Authenticates request based on Authorization header.
 * Enforces user ownership and validity.
 */
export function authenticateRequest(headers) {
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader) {
    return { user: null, error: 'Missing Authorization header' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { user: null, error: 'Invalid Authorization format. Expected Bearer <token>' };
  }

  const token = parts[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return { user: null, error: 'Invalid or expired authentication token' };
  }

  const user = findUserById(decoded.userId);
  if (!user) {
    return { user: null, error: 'User account not found' };
  }

  return { user, error: null };
}
