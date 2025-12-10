import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { interpreters, callLogs, users, reviews, bookings, favorites, interpreterDocuments, interpreterSamples, availabilitySlots } from "../drizzle/schema";
import { eq, like, and, desc, or, sql, isNotNull, asc, gte, lte } from "drizzle-orm";
import { addDistanceToInterpreters, filterByRadius } from "./geocoding";

// Initialize database connection
const connection = mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle(connection);

/**
 * Get user by OpenID
 */
export async function getUserByOpenId(openId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0] || null;
}

/**
 * Upsert user (insert or update)
 */
export async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn: Date;
}) {
  // Try to find existing user
  const existing = await getUserByOpenId(data.openId);

  if (existing) {
    // Update existing user
    await db
      .update(users)
      .set({
        name: data.name,
        email: data.email,
        loginMethod: data.loginMethod,
        lastSignedIn: data.lastSignedIn,
      })
      .where(eq(users.openId, data.openId));
  } else {
    // Insert new user
    await db.insert(users).values(data);
  }

  return getUserByOpenId(data.openId);
}

/**
 * Search interpreters with flexible filtering
 */
export async function searchInterpreters(params: {
  query?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  city?: string;
  state?: string;
  metro?: string;
  zipCode?: string;
  radius?: number;
  availableOnly?: boolean;
  certificationType?: string;
  minExperience?: number;
  maxExperience?: number;
  minRate?: number;
  maxRate?: number;
  proficiencyLevel?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "city" | "createdAt" | "distance" | "rating";
  sortOrder?: "asc" | "desc";
}) {
  const {
    query,
    sourceLanguage,
    targetLanguage,
    city,
    state,
    metro,
    zipCode,
    radius = 25,
    availableOnly,
    certificationType,
    minExperience,
    maxExperience,
    minRate,
    maxRate,
    proficiencyLevel,
    isActive,
    limit = 50,
    offset = 0,
    sortBy = "name",
    sortOrder = "asc",
  } = params;

  let conditions = [];

  // Active status filter
  if (isActive !== undefined) {
    conditions.push(eq(interpreters.isActive, isActive));
  }

  // Text search across name, email, phone
  if (query) {
    conditions.push(
      or(
        like(interpreters.firstName, `%${query}%`),
        like(interpreters.lastName, `%${query}%`),
        like(interpreters.email, `%${query}%`),
        like(interpreters.phone, `%${query}%`)
      )!
    );
  }

  // Language filters
  if (sourceLanguage) {
    conditions.push(eq(interpreters.sourceLanguage, sourceLanguage));
  }
  
  if (targetLanguage) {
    conditions.push(eq(interpreters.targetLanguage, targetLanguage));
  }

  // Location filters
  if (city) {
    conditions.push(like(interpreters.city, `%${city}%`));
  }

  if (state) {
    conditions.push(eq(interpreters.state, state));
  }

  if (metro) {
    conditions.push(like(interpreters.metro, `%${metro}%`));
  }

  // Availability filter
  if (availableOnly) {
    conditions.push(eq(interpreters.isAvailable, true));
  }

  // Advanced filters
  if (certificationType) {
    conditions.push(eq(interpreters.certificationType, certificationType));
  }

  if (minExperience !== undefined) {
    conditions.push(sql`years_of_experience >= ${minExperience}`);
  }

  if (maxExperience !== undefined) {
    conditions.push(sql`years_of_experience <= ${maxExperience}`);
  }

  if (minRate !== undefined) {
    conditions.push(sql`hourly_rate >= ${minRate}`);
  }

  if (maxRate !== undefined) {
    conditions.push(sql`hourly_rate <= ${maxRate}`);
  }

  if (proficiencyLevel) {
    conditions.push(eq(interpreters.proficiencyLevel, proficiencyLevel));
  }

  // Build query with sorting
  const sortColumn =
    sortBy === "name"
      ? interpreters.firstName
      : sortBy === "city"
      ? interpreters.city
      : sortBy === "rating"
      ? interpreters.rating
      : interpreters.createdAt;

  let results = await db
    .select()
    .from(interpreters)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn))
    .limit(zipCode ? 5000 : limit) // Get more results for distance filtering
    .offset(zipCode ? 0 : offset);

  // If ZIP code is provided, add distance and filter by radius
  if (zipCode) {
    const resultsWithDistance = await addDistanceToInterpreters(results, zipCode);
    const filteredResults = filterByRadius(resultsWithDistance, radius);
    
    // Sort by distance if requested
    if (sortBy === "distance") {
      filteredResults.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return sortOrder === "asc" ? a.distance - b.distance : b.distance - a.distance;
      });
    }
    
    // Apply pagination after filtering
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit);
    
    return {
      interpreters: paginatedResults,
      total,
      hasMore: offset + paginatedResults.length < total,
    };
  }

  // Get total count (without ZIP filter)
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(interpreters)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return {
    interpreters: results,
    total: Number(countResult[0]?.count || 0),
    hasMore: offset + results.length < Number(countResult[0]?.count || 0),
  };
}

/**
 * Get interpreter by ID
 */
export async function getInterpreterById(id: number) {
  const result = await db
    .select()
    .from(interpreters)
    .where(eq(interpreters.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Get all unique languages from interpreters (both source and target)
 */
export async function getAllLanguages() {
  const sourceResults = await db
    .select({ language: interpreters.sourceLanguage })
    .from(interpreters)
    .where(and(eq(interpreters.isActive, true), isNotNull(interpreters.sourceLanguage)));

  const targetResults = await db
    .select({ language: interpreters.targetLanguage })
    .from(interpreters)
    .where(and(eq(interpreters.isActive, true), isNotNull(interpreters.targetLanguage)));

  // Extract unique languages from both source and target
  const languageSet = new Set<string>();
  
  sourceResults.forEach((row: { language: string | null }) => {
    if (row.language && row.language.trim() !== '') {
      languageSet.add(row.language);
    }
  });
  
  targetResults.forEach((row: { language: string | null }) => {
    if (row.language && row.language.trim() !== '') {
      languageSet.add(row.language);
    }
  });

  return Array.from(languageSet).sort();
}

/**
 * Get all unique metro areas
 */
export async function getAllMetros() {
  const results = await db
    .selectDistinct({ metro: interpreters.metro })
    .from(interpreters)
    .where(and(eq(interpreters.isActive, true), sql`${interpreters.metro} IS NOT NULL`))
    .orderBy(asc(interpreters.metro));

  return results.map((r: any) => r.metro).filter(Boolean) as string[];
}

/**
 * Get all unique cities
 */
export async function getAllCities() {
  const results = await db
    .selectDistinct({ city: interpreters.city, state: interpreters.state })
    .from(interpreters)
    .where(and(eq(interpreters.isActive, true), sql`${interpreters.city} IS NOT NULL`))
    .orderBy(asc(interpreters.city));

  return results.map((r: any) => ({
    city: r.city!,
    state: r.state || "",
  }));
}

/**
 * Get all unique states
 */
export async function getAllStates() {
  const results = await db
    .selectDistinct({ state: interpreters.state })
    .from(interpreters)
    .where(and(eq(interpreters.isActive, true), sql`${interpreters.state} IS NOT NULL`))
    .orderBy(asc(interpreters.state));

  return results.map((r: any) => r.state).filter(Boolean) as string[];
}

/**
 * Create a new interpreter
 */
export async function createInterpreter(data: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  lat?: string;
  lng?: string;
  metro?: string;
  source?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  zipCode?: string;
  specialties?: string[];
  certifications?: string;
  notes?: string;
}) {
  const result = await db.insert(interpreters).values({
    ...data,
    specialties: data.specialties ? JSON.stringify(data.specialties) : null,
  });

  // Get the inserted interpreter ID
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to create interpreter");
  }

  // Fetch and return the created interpreter
  const created = await db.select().from(interpreters).where(eq(interpreters.id, insertId)).limit(1);
  return created[0];
}

/**
 * Update an interpreter
 */
export async function updateInterpreter(
  id: number,
  data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    country: string;
    timezone: string;
    lat: string;
    lng: string;
    metro: string;
    source: string;
    sourceLanguage?: string;
    targetLanguage: string;
    zipCode?: string;
    specialties: string[];
    certifications: string;
    notes: string;
    isActive: boolean;
  }>
) {
  const updateData: any = { ...data };
  
  if (data.specialties) {
    updateData.specialties = JSON.stringify(data.specialties);
  }

  const result = await db
    .update(interpreters)
    .set(updateData)
    .where(eq(interpreters.id, id));

  return result;
}

/**
 * Delete an interpreter (soft delete by setting isActive = false)
 */
export async function deleteInterpreter(id: number) {
  const result = await db
    .update(interpreters)
    .set({ isActive: false })
    .where(eq(interpreters.id, id));

  return result;
}

/**
 * Hard delete an interpreter
 */
export async function hardDeleteInterpreter(id: number) {
  const result = await db
    .delete(interpreters)
    .where(eq(interpreters.id, id));

  return result;
}

/**
 * Log a call
 */
export async function logCall(data: {
  interpreterId: number;
  userId?: number;
  callSid?: string;
  status?: string;
  duration?: number;
}) {
  const result = await db.insert(callLogs).values(data);
  return result;
}

/**
 * Get call logs for an interpreter
 */
export async function getCallLogs(interpreterId: number, limit = 50) {
  const results = await db
    .select()
    .from(callLogs)
    .where(eq(callLogs.interpreterId, interpreterId))
    .orderBy(desc(callLogs.createdAt))
    .limit(limit);

  return results;
}

/**
 * Get database statistics
 */export async function getStats() {
  const totalInterpreters = await db
    .select({ count: sql<number>`count(*)` })
    .from(interpreters)
    .where(eq(interpreters.isActive, true));

  const totalCalls = await db
    .select({ count: sql<number>`count(*)` })
    .from(callLogs);

  const interpretersByMetro = await db
    .select({
      metro: interpreters.metro,
      count: sql<number>`count(*)`,
    })
    .from(interpreters)
    .where(and(eq(interpreters.isActive, true), sql`${interpreters.metro} IS NOT NULL`))
    .groupBy(interpreters.metro)
    .orderBy(desc(sql`count(*)`)) 
    .limit(10);

  // Count unique languages (both source and target)
  const uniqueLanguages = await db.execute(sql`
    SELECT COUNT(DISTINCT lang) as count FROM (
      SELECT sourceLanguage as lang FROM interpreters WHERE sourceLanguage IS NOT NULL AND sourceLanguage != ''
      UNION
      SELECT targetLanguage as lang FROM interpreters WHERE targetLanguage IS NOT NULL AND targetLanguage != ''
    ) as all_languages
  `);

  // Count unique metros
  const uniqueMetros = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${interpreters.metro})` })
    .from(interpreters)
    .where(sql`${interpreters.metro} IS NOT NULL AND ${interpreters.metro} != ''`);

  // Count unique states
  const uniqueStates = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${interpreters.state})` })
    .from(interpreters)
    .where(sql`${interpreters.state} IS NOT NULL AND ${interpreters.state} != ''`);

  return {
    totalInterpreters: Number(totalInterpreters[0]?.count || 0),
    totalCalls: Number(totalCalls[0]?.count || 0),
    totalLanguages: Number((uniqueLanguages[0] as unknown as any[])[0]?.count || 0),
    totalMetros: Number(uniqueMetros[0]?.count || 0),
    totalStates: Number(uniqueStates[0]?.count || 0),
    topMetros: interpretersByMetro.map((m: any) => ({
      metro: m.metro!,
      count: Number(m.count),
    })),
  };
}

/**
 * Submit a review for an interpreter
 */
export async function submitReview(data: {
  interpreterId: number;
  userId: number;
  rating: number;
  comment?: string;
}) {
  const result = await db.insert(reviews).values(data);
  
  // Update interpreter's average rating
  await updateInterpreterRating(data.interpreterId);
  
  return result;
}

/**
 * Get reviews for an interpreter
 */
export async function getReviews(interpreterId: number, limit = 50) {
  const results = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      userId: reviews.userId,
      userName: users.name,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.interpreterId, interpreterId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  return results;
}

/**
 * Update interpreter's average rating
 */
export async function updateInterpreterRating(interpreterId: number) {
  const ratingResult = await db
    .select({
      avgRating: sql<number>`AVG(${reviews.rating})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(eq(reviews.interpreterId, interpreterId));

  const avgRating = Number(ratingResult[0]?.avgRating || 0);
  
  await db
    .update(interpreters)
    .set({ rating: avgRating.toFixed(2) })
    .where(eq(interpreters.id, interpreterId));

  return avgRating;
}

/**
 * Get user's review for an interpreter
 */
export async function getUserReview(interpreterId: number, userId: number) {
  const result = await db
    .select()
    .from(reviews)
    .where(and(
      eq(reviews.interpreterId, interpreterId),
      eq(reviews.userId, userId)
    ))
    .limit(1);

  return result[0] || null;
}

/**
 * Create a new booking
 */
export async function createBooking(data: {
  interpreterId: number;
  userId: number;
  scheduledDate: Date;
  duration: number;
  notes?: string;
}) {
  const result = await db.insert(bookings).values({
    ...data,
    status: "pending",
  });

  return result;
}

/**
 * Get bookings for a user
 */
export async function getUserBookings(userId: number, limit = 50) {
  const results = await db
    .select({
      id: bookings.id,
      interpreterId: bookings.interpreterId,
      interpreterFirstName: interpreters.firstName,
      interpreterLastName: interpreters.lastName,
      interpreterEmail: interpreters.email,
      interpreterPhone: interpreters.phone,
      scheduledDate: bookings.scheduledDate,
      duration: bookings.duration,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .leftJoin(interpreters, eq(bookings.interpreterId, interpreters.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.scheduledDate))
    .limit(limit);

  return results;
}

/**
 * Get bookings for an interpreter
 */
export async function getInterpreterBookings(interpreterId: number, limit = 50) {
  const results = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      userName: users.name,
      userEmail: users.email,
      scheduledDate: bookings.scheduledDate,
      duration: bookings.duration,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.interpreterId, interpreterId))
    .orderBy(desc(bookings.scheduledDate))
    .limit(limit);

  return results;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: number,
  status: "pending" | "confirmed" | "cancelled" | "completed"
) {
  const result = await db
    .update(bookings)
    .set({ status })
    .where(eq(bookings.id, bookingId));

  return result;
}

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: number) {
  const result = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  return result[0] || null;
}

/**
 * Delete a booking
 */
export async function deleteBooking(bookingId: number) {
  const result = await db
    .delete(bookings)
    .where(eq(bookings.id, bookingId));

  return result;
}

/**
 * Add interpreter to favorites
 */
export async function addFavorite(userId: number, interpreterId: number) {
  try {
    const result = await db.insert(favorites).values({
      userId,
      interpreterId,
    });
    return result;
  } catch (error: any) {
    // Handle duplicate key error gracefully
    if (error.code === 'ER_DUP_ENTRY') {
      return null; // Already favorited
    }
    throw error;
  }
}

/**
 * Remove interpreter from favorites
 */
export async function removeFavorite(userId: number, interpreterId: number) {
  const result = await db
    .delete(favorites)
    .where(and(
      eq(favorites.userId, userId),
      eq(favorites.interpreterId, interpreterId)
    ));
  
  return result;
}

/**
 * Get user's favorite interpreters
 */
export async function getUserFavorites(userId: number, limit = 50) {
  const results = await db
    .select({
      id: favorites.id,
      interpreterId: favorites.interpreterId,
      createdAt: favorites.createdAt,
      firstName: interpreters.firstName,
      lastName: interpreters.lastName,
      email: interpreters.email,
      phone: interpreters.phone,
      sourceLanguage: interpreters.sourceLanguage,
      targetLanguage: interpreters.targetLanguage,
      city: interpreters.city,
      state: interpreters.state,
      metro: interpreters.metro,
      lat: interpreters.lat,
      lng: interpreters.lng,
      rating: interpreters.rating,
      isAvailable: interpreters.isAvailable,
    })
    .from(favorites)
    .leftJoin(interpreters, eq(favorites.interpreterId, interpreters.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt))
    .limit(limit);

  return results;
}

/**
 * Check if interpreter is favorited by user
 */
export async function isFavorited(userId: number, interpreterId: number): Promise<boolean> {
  const result = await db
    .select()
    .from(favorites)
    .where(and(
      eq(favorites.userId, userId),
      eq(favorites.interpreterId, interpreterId)
    ))
    .limit(1);

  return result.length > 0;
}

/**
 * Get favorite IDs for a user (for bulk checking)
 */
export async function getUserFavoriteIds(userId: number): Promise<number[]> {
  const results = await db
    .select({ interpreterId: favorites.interpreterId })
    .from(favorites)
    .where(eq(favorites.userId, userId));

  return results.map(r => r.interpreterId);
}

/**
 * Update interpreter profile photo
 */
export async function updateInterpreterPhoto(interpreterId: number, photoUrl: string) {
  await db
    .update(interpreters)
    .set({ profilePhotoUrl: photoUrl })
    .where(eq(interpreters.id, interpreterId));
}

/**
 * Update interpreter video introduction
 */
export async function updateInterpreterVideo(interpreterId: number, videoUrl: string) {
  await db
    .update(interpreters)
    .set({ videoIntroUrl: videoUrl })
    .where(eq(interpreters.id, interpreterId));
}

/**
 * Add interpreter document
 */
export async function addInterpreterDocument(data: {
  interpreterId: number;
  documentType: string;
  documentUrl: string;
  documentName?: string;
}) {
  const result = await db.insert(interpreterDocuments).values(data);
  return result;
}

/**
 * Get interpreter documents
 */
export async function getInterpreterDocuments(interpreterId: number) {
  return await db
    .select()
    .from(interpreterDocuments)
    .where(eq(interpreterDocuments.interpreterId, interpreterId))
    .orderBy(desc(interpreterDocuments.uploadedAt));
}

/**
 * Delete interpreter document
 */
export async function deleteInterpreterDocument(documentId: number) {
  await db
    .delete(interpreterDocuments)
    .where(eq(interpreterDocuments.id, documentId));
}

/**
 * Add interpreter work sample
 */
export async function addInterpreterSample(data: {
  interpreterId: number;
  sampleType: string;
  sampleUrl: string;
  sampleName?: string;
  description?: string;
}) {
  const result = await db.insert(interpreterSamples).values(data);
  return result;
}

/**
 * Get interpreter work samples
 */
export async function getInterpreterSamples(interpreterId: number) {
  return await db
    .select()
    .from(interpreterSamples)
    .where(eq(interpreterSamples.interpreterId, interpreterId))
    .orderBy(desc(interpreterSamples.uploadedAt));
}

/**
 * Delete interpreter work sample
 */
export async function deleteInterpreterSample(sampleId: number) {
  await db
    .delete(interpreterSamples)
    .where(eq(interpreterSamples.id, sampleId));
}

/**
 * Create availability slot
 */
export async function createAvailabilitySlot(data: {
  interpreterId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  const result = await db.insert(availabilitySlots).values(data);
  
  // Get the inserted slot ID
  const insertId = result[0]?.insertId;
  if (!insertId) {
    throw new Error("Failed to create availability slot");
  }

  // Fetch and return the created slot
  const created = await db.select().from(availabilitySlots).where(eq(availabilitySlots.id, insertId)).limit(1);
  return created[0];
}

/**
 * Get availability slots for interpreter
 */
export async function getInterpreterAvailability(interpreterId: number) {
  const result = await db
    .select()
    .from(availabilitySlots)
    .where(eq(availabilitySlots.interpreterId, interpreterId))
    .orderBy(asc(availabilitySlots.dayOfWeek), asc(availabilitySlots.startTime));

  return result;
}

/**
 * Delete availability slot
 */
export async function deleteAvailabilitySlot(slotId: number) {
  await db.delete(availabilitySlots).where(eq(availabilitySlots.id, slotId));
  return { success: true };
}

/**
 * Check if time slot conflicts with existing bookings
 */
export async function checkBookingConflict(
  interpreterId: number,
  scheduledDate: Date,
  duration: number
): Promise<boolean> {
  const endTime = new Date(scheduledDate.getTime() + duration * 60000);
  
  const conflicts = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.interpreterId, interpreterId),
        eq(bookings.status, "confirmed"),
        sql`${bookings.scheduledDate} < ${endTime}`,
        sql`DATE_ADD(${bookings.scheduledDate}, INTERVAL ${bookings.duration} MINUTE) > ${scheduledDate}`
      )
    );

  return conflicts.length > 0;
}

/**
 * Get interpreters for verification (admin only)
 */
export async function getInterpretersForVerification(status?: 'pending' | 'approved' | 'rejected') {
  let query = db.select().from(interpreters);
  
  if (status) {
    query = query.where(eq(interpreters.approvalStatus, status)) as any;
  }
  
  const result = await query.orderBy(desc(interpreters.createdAt)).limit(100);
  return result;
}

/**
 * Update interpreter verification status (admin only)
 */
export async function updateInterpreterStatus(id: number, status: 'pending' | 'approved' | 'rejected') {
  await db
    .update(interpreters)
    .set({ approvalStatus: status, updatedAt: new Date() })
    .where(eq(interpreters.id, id));
  
  return { success: true, id, status };
}
