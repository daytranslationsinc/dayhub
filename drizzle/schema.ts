import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Interpreters table - main directory of interpreters
 */
export const interpreters = mysqlTable("interpreters", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("USA"),
  timezone: varchar("timezone", { length: 100 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  metro: varchar("metro", { length: 255 }),
  source: varchar("source", { length: 255 }),
  sourceLanguage: varchar("sourceLanguage", { length: 100 }).default("English"),
  targetLanguage: varchar("targetLanguage", { length: 100 }).notNull(),
  zipCode: varchar("zipCode", { length: 10 }),
  specialties: text("specialties"), // JSON array of specialties
  certifications: text("certifications"),
  isAvailable: boolean("is_available").default(true),
  lastActive: timestamp("last_active").defaultNow(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  yearsOfExperience: int("years_of_experience").default(0),
  certificationType: varchar("certification_type", { length: 100 }),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  proficiencyLevel: varchar("proficiency_level", { length: 50 }),
  profilePhotoUrl: text("profile_photo_url"),
  videoIntroUrl: text("video_intro_url"),
  approvalStatus: mysqlEnum("approval_status", ["pending", "approved", "rejected"]).default("approved"),
  isVetted: boolean("is_vetted").default(false).notNull(),
  vettedNotes: text("vetted_notes"),
  // Interpreter auth fields
  loginToken: varchar("login_token", { length: 64 }).unique(), // Magic link token for passwordless login
  tokenExpiresAt: timestamp("token_expires_at"), // Token expiration
  lastLoginAt: timestamp("last_login_at"), // Last login timestamp
  resumeUrl: text("resume_url"), // URL to uploaded resume/CV
  voiceClipUrl: text("voice_clip_url"), // URL to 30-second voice authentication clip
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  cityIdx: index("city_idx").on(table.city),
  stateIdx: index("state_idx").on(table.state),
  metroIdx: index("metro_idx").on(table.metro),
  isActiveIdx: index("is_active_idx").on(table.isActive),
  sourceLanguageIdx: index("source_language_idx").on(table.sourceLanguage),
  targetLanguageIdx: index("target_language_idx").on(table.targetLanguage),
  zipCodeIdx: index("zip_code_idx").on(table.zipCode),
}));

export type Interpreter = typeof interpreters.$inferSelect;
export type InsertInterpreter = typeof interpreters.$inferInsert;

/**
 * Call logs for Twilio integration
 */
export const savedSearches = mysqlTable(
  "saved_searches",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    searchQuery: text("search_query"),
    language: varchar("language", { length: 100 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 2 }),
    metro: varchar("metro", { length: 255 }),
    specialty: varchar("specialty", { length: 100 }),
    certification: varchar("certification", { length: 100 }),
    isPreset: boolean("is_preset").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
  })
);

export const callLogs = mysqlTable("callLogs", {
  id: int("id").autoincrement().primaryKey(),
  interpreterId: int("interpreterId").notNull(),
  userId: int("userId"),
  callSid: varchar("callSid", { length: 255 }),
  status: varchar("status", { length: 50 }),
  duration: int("duration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

/**
 * Reviews table for interpreter ratings and feedback
 */
export const reviews = mysqlTable(
  "reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    interpreterId: int("interpreter_id").notNull(),
    userId: int("user_id").notNull(),
    rating: int("rating").notNull(), // 1-5 stars
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    interpreterIdIdx: index("interpreter_id_idx").on(table.interpreterId),
    userIdIdx: index("user_id_idx").on(table.userId),
  })
);

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Bookings table for appointment scheduling
 */
export const bookings = mysqlTable(
  "bookings",
  {
    id: int("id").autoincrement().primaryKey(),
    interpreterId: int("interpreter_id").notNull(),
    userId: int("user_id").notNull(),
    scheduledDate: timestamp("scheduled_date", { mode: "date" }).notNull(),
    duration: int("duration").notNull(), // Duration in minutes
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, confirmed, cancelled, completed
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    interpreterIdIdx: index("interpreter_id_idx").on(table.interpreterId),
    userIdIdx: index("user_id_idx").on(table.userId),
    statusIdx: index("status_idx").on(table.status),
    scheduledDateIdx: index("scheduled_date_idx").on(table.scheduledDate),
  })
);

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Favorites table for users to bookmark interpreters
 */
export const favorites = mysqlTable(
  "favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    interpreterId: int("interpreter_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    interpreterIdIdx: index("interpreter_id_idx").on(table.interpreterId),
    // Unique constraint to prevent duplicate favorites
    uniqueUserInterpreter: index("unique_user_interpreter").on(table.userId, table.interpreterId),
  })
);

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Availability Requests table for email-based booking system
 * Allows clients to request interpreter availability without login
 */
export const availabilityRequests = mysqlTable(
  "availability_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    interpreterId: int("interpreter_id").notNull(),
    clientName: varchar("client_name", { length: 255 }).notNull(),
    clientEmail: varchar("client_email", { length: 320 }).notNull(),
    clientPhone: varchar("client_phone", { length: 50 }),
    requestedDate: timestamp("requested_date", { mode: "date" }).notNull(),
    requestedTime: varchar("requested_time", { length: 50 }).notNull(),
    duration: int("duration").notNull(), // Duration in minutes
    location: varchar("location", { length: 500 }).notNull(), // In-person location
    sourceLanguage: varchar("source_language", { length: 100 }).notNull(),
    targetLanguage: varchar("target_language", { length: 100 }).notNull(),
    notes: text("notes"),
    status: mysqlEnum("status", ["pending", "confirmed", "declined", "cancelled"]).default("pending").notNull(),
    interpreterNotes: text("interpreter_notes"), // Notes from interpreter when confirming/declining
    confirmationToken: varchar("confirmation_token", { length: 64 }).notNull().unique(), // For interpreter to confirm via email link
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    interpreterIdIdx: index("interpreter_id_idx").on(table.interpreterId),
    statusIdx: index("status_idx").on(table.status),
    requestedDateIdx: index("requested_date_idx").on(table.requestedDate),
    confirmationTokenIdx: index("confirmation_token_idx").on(table.confirmationToken),
  })
);

export type AvailabilityRequest = typeof availabilityRequests.$inferSelect;
export type InsertAvailabilityRequest = typeof availabilityRequests.$inferInsert;

/**
 * Availability slots table for interpreter weekly schedules
 */
export const availabilitySlots = mysqlTable(
  "availability_slots",
  {
    id: int("id").autoincrement().primaryKey(),
    interpreterId: int("interpreter_id").notNull(),
    dayOfWeek: int("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
    startTime: varchar("start_time", { length: 5 }).notNull(), // Format: "HH:MM" (24-hour)
    endTime: varchar("end_time", { length: 5 }).notNull(), // Format: "HH:MM" (24-hour)
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    interpreterIdIdx: index("interpreter_id_idx").on(table.interpreterId),
    dayOfWeekIdx: index("day_of_week_idx").on(table.dayOfWeek),
  })
);

export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type InsertAvailabilitySlot = typeof availabilitySlots.$inferInsert;

/**
 * Interpreter documents table for certifications and credentials
 */
export const interpreterDocuments = mysqlTable(
  "interpreter_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    interpreterId: int("interpreter_id").notNull(),
    documentType: varchar("document_type", { length: 100 }).notNull(),
    documentUrl: text("document_url").notNull(),
    documentName: varchar("document_name", { length: 255 }),
    uploadedAt: timestamp("uploaded_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    interpreterIdIdx: index("interpreter_id_idx").on(table.interpreterId),
  })
);

export type InterpreterDocument = typeof interpreterDocuments.$inferSelect;
export type InsertInterpreterDocument = typeof interpreterDocuments.$inferInsert;

/**
 * Interpreter work samples table
 */
export const interpreterSamples = mysqlTable(
  "interpreter_samples",
  {
    id: int("id").autoincrement().primaryKey(),
    interpreterId: int("interpreter_id").notNull(),
    sampleType: varchar("sample_type", { length: 100 }).notNull(),
    sampleUrl: text("sample_url").notNull(),
    sampleName: varchar("sample_name", { length: 255 }),
    description: text("description"),
    uploadedAt: timestamp("uploaded_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    interpreterIdIdx: index("interpreter_id_idx").on(table.interpreterId),
  })
);

export type InterpreterSample = typeof interpreterSamples.$inferSelect;
export type InsertInterpreterSample = typeof interpreterSamples.$inferInsert;
