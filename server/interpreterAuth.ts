import { db } from "./db";
import { interpreters } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate and send magic link login email to interpreter
 */
export async function sendInterpreterLoginLink(email: string) {
  // Find interpreter by email
  const [interpreter] = await db
    .select()
    .from(interpreters)
    .where(eq(interpreters.email, email))
    .limit(1);

  if (!interpreter) {
    throw new Error("No interpreter found with this email address");
  }

  // Generate login token (valid for 24 hours)
  const loginToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Update interpreter with login token
  await db
    .update(interpreters)
    .set({
      loginToken,
      tokenExpiresAt,
    })
    .where(eq(interpreters.id, interpreter.id));

  // Construct login URL
  const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL || 'https://3000-ioqqc66og0kswa4ozd71q-c2ab7b90.manusvm.computer';
  const loginUrl = `${baseUrl}/interpreter-login?token=${loginToken}`;

  // TODO: Send email with login link
  console.log('Magic link login URL:', loginUrl);
  console.log('Send to:', email);

  return {
    success: true,
    message: 'Login link sent to your email',
  };
}

/**
 * Verify login token and return interpreter data
 */
export async function verifyInterpreterLoginToken(token: string) {
  const [interpreter] = await db
    .select()
    .from(interpreters)
    .where(eq(interpreters.loginToken, token))
    .limit(1);

  if (!interpreter) {
    throw new Error('Invalid login token');
  }

  // Check if token is expired
  if (interpreter.tokenExpiresAt && interpreter.tokenExpiresAt < new Date()) {
    throw new Error('Login token has expired. Please request a new one.');
  }

  // Update last login timestamp
  await db
    .update(interpreters)
    .set({
      lastLoginAt: new Date(),
    })
    .where(eq(interpreters.id, interpreter.id));

  return {
    id: interpreter.id,
    firstName: interpreter.firstName,
    lastName: interpreter.lastName,
    email: interpreter.email,
  };
}

/**
 * Get interpreter profile for editing
 */
export async function getInterpreterProfile(interpreterId: number) {
  const [interpreter] = await db
    .select()
    .from(interpreters)
    .where(eq(interpreters.id, interpreterId))
    .limit(1);

  if (!interpreter) {
    throw new Error('Interpreter not found');
  }

  return interpreter;
}

/**
 * Update interpreter profile
 */
export async function updateInterpreterProfile(
  interpreterId: number,
  updates: {
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    specialties?: string;
    certifications?: string;
    yearsOfExperience?: number;
    hourlyRate?: string;
    proficiencyLevel?: string;
    profilePhotoUrl?: string;
    resumeUrl?: string;
    voiceClipUrl?: string;
    notes?: string;
  }
) {
  await db
    .update(interpreters)
    .set(updates)
    .where(eq(interpreters.id, interpreterId));

  return {
    success: true,
    message: 'Profile updated successfully',
  };
}
