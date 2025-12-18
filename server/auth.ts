import { eq, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, refreshTokens, InsertUser } from "../drizzle/schema";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { nanoid } from "nanoid";

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate an access token (short-lived)
 */
export async function generateAccessToken(userId: number, email: string, role: string): Promise<string> {
  const secret = getJwtSecret();
  
  return new jose.SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);
}

/**
 * Generate a refresh token (long-lived, stored in DB)
 */
export async function generateRefreshToken(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const token = nanoid(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  
  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });
  
  return token;
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<{ userId: number; email: string; role: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token and return new tokens
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Find valid refresh token
  const [tokenRecord] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, refreshToken),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  
  if (!tokenRecord) return null;
  
  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenRecord.userId))
    .limit(1);
  
  if (!user || !user.isActive) return null;
  
  // Delete old refresh token
  await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
  
  // Generate new tokens
  const newAccessToken = await generateAccessToken(user.id, user.email, user.role);
  const newRefreshToken = await generateRefreshToken(user.id);
  
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Register a new user
 */
export async function registerUser(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string; user?: typeof users.$inferSelect }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (existingUser) {
    return { success: false, error: "Email already registered" };
  }
  
  // Validate password strength
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }
  
  // Hash password and create user
  const passwordHash = await hashPassword(password);
  
  await db.insert(users).values({
    email,
    passwordHash,
    name: name || null,
    role: "user",
    isActive: true,
  });
  
  const [newUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return { success: true, user: newUser };
}

/**
 * Login a user
 */
export async function loginUser(email: string, password: string): Promise<{ 
  success: boolean; 
  error?: string; 
  accessToken?: string; 
  refreshToken?: string;
  user?: Omit<typeof users.$inferSelect, 'passwordHash'>;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }
  
  if (!user.isActive) {
    return { success: false, error: "Account is disabled" };
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid email or password" };
  }
  
  // Update last signed in
  await db.update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));
  
  // Generate tokens
  const accessToken = await generateAccessToken(user.id, user.email, user.role);
  const refreshToken = await generateRefreshToken(user.id);
  
  // Return user without password hash
  const { passwordHash, ...userWithoutPassword } = user;
  
  return {
    success: true,
    accessToken,
    refreshToken,
    user: userWithoutPassword,
  };
}

/**
 * Logout a user (invalidate refresh token)
 */
export async function logoutUser(refreshToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<Omit<typeof users.$inferSelect, 'passwordHash'> | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user) return null;
  
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Clean up expired refresh tokens
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(refreshTokens).where(gt(new Date(), refreshTokens.expiresAt));
}
