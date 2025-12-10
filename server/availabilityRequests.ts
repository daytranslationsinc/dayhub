import { db } from "./db";
import { availabilityRequests } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendAvailabilityRequestEmail, sendClientNotificationEmail } from "./email";
import crypto from "crypto";

/**
 * Create a new availability request and send email to interpreter
 */
export async function createAvailabilityRequest(params: {
  interpreterId: number;
  interpreterEmail: string;
  interpreterName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  requestedDate: Date;
  requestedTime: string;
  duration: number;
  location: string;
  sourceLanguage: string;
  targetLanguage: string;
  notes?: string;
}) {
  // Generate unique confirmation token
  const confirmationToken = crypto.randomBytes(32).toString('hex');

  // Insert into database
  const [request] = await db.insert(availabilityRequests).values({
    interpreterId: params.interpreterId,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    clientPhone: params.clientPhone,
    requestedDate: params.requestedDate,
    requestedTime: params.requestedTime,
    duration: params.duration,
    location: params.location,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    notes: params.notes,
    confirmationToken,
    status: "pending",
  });

  // Send email to interpreter
  await sendAvailabilityRequestEmail({
    interpreterEmail: params.interpreterEmail,
    interpreterName: params.interpreterName,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    clientPhone: params.clientPhone,
    requestedDate: params.requestedDate.toLocaleDateString(),
    requestedTime: params.requestedTime,
    duration: params.duration,
    location: params.location,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    notes: params.notes,
    confirmationToken,
  });

  return request;
}

/**
 * Confirm or decline an availability request
 */
export async function updateAvailabilityRequest(params: {
  confirmationToken: string;
  action: 'confirm' | 'decline';
  interpreterNotes?: string;
}) {
  const { confirmationToken, action, interpreterNotes } = params;

  // Find the request
  const [request] = await db
    .select()
    .from(availabilityRequests)
    .where(eq(availabilityRequests.confirmationToken, confirmationToken))
    .limit(1);

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('Request has already been processed');
  }

  // Update status
  const newStatus = action === 'confirm' ? 'confirmed' : 'declined';
  await db
    .update(availabilityRequests)
    .set({
      status: newStatus,
      interpreterNotes,
    })
    .where(eq(availabilityRequests.confirmationToken, confirmationToken));

  // Send notification to client
  await sendClientNotificationEmail({
    clientEmail: request.clientEmail,
    clientName: request.clientName,
    interpreterName: 'Interpreter', // We'll need to join with interpreters table to get the name
    status: newStatus,
    requestedDate: request.requestedDate.toLocaleDateString(),
    requestedTime: request.requestedTime,
    interpreterNotes,
  });

  return {
    success: true,
    status: newStatus,
  };
}

/**
 * Get all requests for an interpreter
 */
export async function getInterpreterRequests(interpreterId: number) {
  return await db
    .select()
    .from(availabilityRequests)
    .where(eq(availabilityRequests.interpreterId, interpreterId));
}
