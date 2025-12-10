import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { interpreters } from "../drizzle/schema";
import mysql from "mysql2/promise";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import * as availabilityRequestsDb from "./availabilityRequests";
import { interpreterAuthRouter } from "./interpreterAuthRouters";
import { ENV } from "./_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

/**
 * Auth router for authentication
 */
const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),
  logout: protectedProcedure.mutation(() => {
    // Logout is handled by clearing cookies in the frontend
    return { success: true };
  }),

  // Simple static password login for admin
  adminLogin: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.password !== ENV.adminPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      // Create or get admin user
      const adminOpenId = "admin-static-user";
      let adminUser = await db.getUserByOpenId(adminOpenId);

      if (!adminUser) {
        // Create admin user
        await db.upsertUser({
          openId: adminOpenId,
          name: "Admin",
          email: "admin@dayhub.local",
          loginMethod: "password",
          lastSignedIn: new Date(),
        });
        adminUser = await db.getUserByOpenId(adminOpenId);

        // Update role to admin directly in database
        const conn = await mysql.createConnection(process.env.DATABASE_URL!);
        await conn.execute("UPDATE users SET role = 'admin' WHERE openId = ?", [adminOpenId]);
        await conn.end();

        adminUser = await db.getUserByOpenId(adminOpenId);
      } else {
        await db.upsertUser({
          openId: adminOpenId,
          lastSignedIn: new Date(),
        });
      }

      // Create session token using sdk
      const sessionToken = await sdk.createSessionToken(adminOpenId, {
        name: "Admin",
        expiresInMs: ONE_YEAR_MS,
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, user: adminUser };
    }),
});

/**
 * Main application router
 */
export const appRouter = router({
  auth: authRouter,
  system: systemRouter,
  interpreterAuth: interpreterAuthRouter,
  /**
   * Search interpreters with advanced filtering
   */
  searchInterpreters: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        sourceLanguage: z.string().optional(),
        targetLanguage: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        metro: z.string().optional(),
        zipCode: z.string().optional(),
        radius: z.number().min(1).max(100).optional().default(25),
        availableOnly: z.boolean().optional(),
        certificationType: z.string().optional(),
        minExperience: z.number().min(0).optional(),
        maxExperience: z.number().min(0).optional(),
        minRate: z.number().min(0).optional(),
        maxRate: z.number().min(0).optional(),
        proficiencyLevel: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        sortBy: z.enum(["name", "city", "createdAt", "distance", "rating"]).optional().default("name"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
      })
    )
    .query(async ({ input }) => {
      const result = await db.searchInterpreters(input);
      // Convert rating from string to number
      return {
        ...result,
        interpreters: result.interpreters.map((interpreter: any) => ({
          ...interpreter,
          rating: interpreter.rating ? parseFloat(interpreter.rating) : null,
        })),
      };
    }),

  /**
   * Get interpreter by ID
   */
  getInterpreter: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const interpreter = await db.getInterpreterById(input.id);
      if (!interpreter) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interpreter not found",
        });
      }

      // Parse JSON fields
      return {
        ...interpreter,
        specialties: interpreter.specialties ? JSON.parse(interpreter.specialties) : [],
      };
    }),

  /**
   * Get all unique languages
   */
  getLanguages: publicProcedure.query(async () => {
    return await db.getAllLanguages();
  }),

  /**
   * Get all unique metros
   */
  getMetros: publicProcedure.query(async () => {
    return await db.getAllMetros();
  }),

  exportToCSV: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        sourceLanguage: z.string().optional(),
        targetLanguage: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        metro: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const interpreters = await db.searchInterpreters({
        query: input.query,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        city: input.city,
        state: input.state,
        metro: input.metro,
        limit: 10000, // Export all matching results
        offset: 0,
      });

      // Convert to CSV format
      const headers = [
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "City",
        "State",
        "Metro",
        "Languages",
        "Specialties",
        "Certifications",
        "Source",
      ];

      const rows = interpreters.interpreters.map((interpreter: any) => {
        let languages = "";
        let specialties = "";
        try {
          if (interpreter.languages) {
            languages = JSON.parse(interpreter.languages).join("; ");
          }
          if (interpreter.specialties) {
            specialties = JSON.parse(interpreter.specialties).join("; ");
          }
        } catch (e) {
          // ignore
        }

        return [
          interpreter.firstName || "",
          interpreter.lastName || "",
          interpreter.email || "",
          interpreter.phone || "",
          interpreter.city || "",
          interpreter.state || "",
          interpreter.metro || "",
          languages,
          specialties,
          interpreter.certifications || "",
          interpreter.source || "",
        ];
      });

      // Build CSV string
      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) =>
          row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      return {
        csv: csvContent,
        count: interpreters.interpreters.length,
      };
    }),

  /**
   * Get all unique cities
   */
  getCities: publicProcedure.query(async () => {
    return await db.getAllCities();
  }),

  /**
   * Get all unique states
   */
  getStates: publicProcedure.query(async () => {
    return await db.getAllStates();
  }),

  /**
   * Get database statistics
   */
  getStats: publicProcedure.query(async () => {
    return await db.getStats();
  }),

  /**
   * Create a new interpreter (protected)
   */
  createInterpreter: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional().default("USA"),
        timezone: z.string().optional(),
        lat: z.string().optional(),
        lng: z.string().optional(),
        metro: z.string().optional(),
        source: z.string().optional(),
        sourceLanguage: z.string().optional(),
        targetLanguage: z.string(),
        zipCode: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        certifications: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createInterpreter(input);
    }),

  /**
   * Update an interpreter (protected)
   */
  updateInterpreter: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        lat: z.string().optional(),
        lng: z.string().optional(),
        metro: z.string().optional(),
        source: z.string().optional(),
        sourceLanguage: z.string().optional(),
        targetLanguage: z.string(),
        zipCode: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        certifications: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateInterpreter(id, data);
    }),

  /**
   * Delete an interpreter (soft delete, protected)
   */
  deleteInterpreter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteInterpreter(input.id);
    }),

  /**
   * Log a call
   */
  logCall: protectedProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        callSid: z.string().optional(),
        status: z.string().optional(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.logCall({
        ...input,
        userId: ctx.user.id,
      });
    }),

  // Saved Searches
  getSavedSearches: protectedProcedure.query(async ({ ctx }) => {
    const conn = await mysql.createConnection(process.env.DATABASE_URL!);
    const [searches] = await conn.execute(
      "SELECT * FROM saved_searches WHERE user_id = ? OR is_preset = TRUE ORDER BY is_preset DESC, created_at DESC",
      [ctx.user.id]
    );
    await conn.end();
    return searches;
  }),

  createSavedSearch: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        searchQuery: z.string().optional(),
        sourceLanguage: z.string().optional(),
        targetLanguage: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        metro: z.string().optional(),
        specialty: z.string().optional(),
        certification: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);
      const [result] = await conn.execute(
        `INSERT INTO saved_searches (user_id, name, search_query, source_language, target_language, city, state, metro, specialty, certification) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ctx.user.id,
          input.name,
          input.searchQuery || null,
          input.sourceLanguage || null,
          input.targetLanguage || null,
          input.city || null,
          input.state || null,
          input.metro || null,
          input.specialty || null,
          input.certification || null,
        ]
      );
      await conn.end();
      return { success: true, id: (result as any).insertId };
    }),

  deleteSavedSearch: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);
      await conn.execute(
        "DELETE FROM saved_searches WHERE id = ? AND user_id = ?",
        [input.id, ctx.user.id]
      );
      await conn.end();
      return { success: true };
    }),

  /**
   * Get call logs for an interpreter
   */
  getCallLogs: publicProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return await db.getCallLogs(input.interpreterId, input.limit);
    }),

  /**
   * Submit a review for an interpreter
   */
  submitReview: protectedProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.submitReview({
        ...input,
        userId: ctx.user.id,
      });
    }),

  /**
   * Get reviews for an interpreter
   */
  getReviews: publicProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return await db.getReviews(input.interpreterId, input.limit);
    }),

  /**
   * Get user's review for an interpreter
   */
  getUserReview: protectedProcedure
    .input(z.object({ interpreterId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await db.getUserReview(input.interpreterId, ctx.user.id);
    }),

  /**
   * Create a new booking
   */
  createBooking: protectedProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        scheduledDate: z.string(), // ISO date string
        duration: z.number().min(15).max(480), // 15 min to 8 hours
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const booking = await db.createBooking({
        interpreterId: input.interpreterId,
        userId: ctx.user.id,
        scheduledDate: new Date(input.scheduledDate),
        duration: input.duration,
        notes: input.notes,
      });

      // Send notification to owner
      const { notifyOwner } = await import("./_core/notification");
      const interpreter = await db.getInterpreterById(input.interpreterId);
      await notifyOwner({
        title: "New Booking Request",
        content: `${ctx.user.name} has requested a booking with ${interpreter?.firstName} ${interpreter?.lastName} on ${new Date(input.scheduledDate).toLocaleDateString()} for ${input.duration} minutes.`,
      });

      return booking;
    }),

  /**
   * Get user's bookings
   */
  getUserBookings: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      return await db.getUserBookings(ctx.user.id, input.limit);
    }),

  /**
   * Get interpreter's bookings
   */
  getInterpreterBookings: publicProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return await db.getInterpreterBookings(input.interpreterId, input.limit);
    }),

  /**
   * Update booking status
   */
  updateBookingStatus: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await db.updateBookingStatus(input.bookingId, input.status);

      // Send notification on status change
      if (input.status === "confirmed" || input.status === "cancelled") {
        const { notifyOwner } = await import("./_core/notification");
        const booking = await db.getBookingById(input.bookingId);
        if (booking) {
          await notifyOwner({
            title: `Booking ${input.status === "confirmed" ? "Confirmed" : "Cancelled"}`,
            content: `Booking #${input.bookingId} has been ${input.status} by ${ctx.user.name}.`,
          });
        }
      }

      return result;
    }),

  /**
   * Delete a booking
   */
  deleteBooking: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteBooking(input.bookingId);
    }),

  /**
   * Add interpreter to favorites
   */
  addFavorite: protectedProcedure
    .input(z.object({ interpreterId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await db.addFavorite(ctx.user.id, input.interpreterId);
    }),

  /**
   * Remove interpreter from favorites
   */
  removeFavorite: protectedProcedure
    .input(z.object({ interpreterId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await db.removeFavorite(ctx.user.id, input.interpreterId);
    }),

  /**
   * Get user's favorite interpreters
   */
  getUserFavorites: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional().default(50) }))
    .query(async ({ input, ctx }) => {
      return await db.getUserFavorites(ctx.user.id, input.limit);
    }),

  /**
   * Check if interpreter is favorited
   */
  isFavorited: protectedProcedure
    .input(z.object({ interpreterId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await db.isFavorited(ctx.user.id, input.interpreterId);
    }),

  /**
   * Get user's favorite interpreter IDs
   */
  getUserFavoriteIds: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.getUserFavoriteIds(ctx.user.id);
    }),

  /**
   * Geocode an address or ZIP code
   */
  geocode: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const { geocodeAddress } = await import("./geocoding");
      return await geocodeAddress(input.address);
    }),

  /**
   * Upload profile photo
   */
  uploadProfilePhoto: protectedProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `interpreters/${input.interpreterId}/profile-${Date.now()}.${input.mimeType.split("/")[1]}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      await db.updateInterpreterPhoto(input.interpreterId, url);
      return { url };
    }),

  /**
   * Upload certification document
   */
  uploadCertification: protectedProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
        documentType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `interpreters/${input.interpreterId}/certs/${input.fileName}-${Date.now()}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      await db.addInterpreterDocument({
        interpreterId: input.interpreterId,
        documentType: input.documentType,
        documentUrl: url,
        documentName: input.fileName,
      });
      return { url };
    }),

  /**
   * Get interpreter documents
   */
  getInterpreterDocuments: publicProcedure
    .input(z.object({ interpreterId: z.number() }))
    .query(async ({ input }) => {
      return await db.getInterpreterDocuments(input.interpreterId);
    }),

  /**
   * Export interpreters to CSV
   */
  exportInterpretersCSV: protectedProcedure
    .input(
      z.object({
        sourceLanguage: z.string().optional(),
        targetLanguage: z.string().optional(),
        state: z.string().optional(),
        metro: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Only allow admin users to export
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const results = await db.searchInterpreters({
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        state: input.state,
        metro: input.metro,
        limit: 10000,
        offset: 0,
      });

      // Convert to CSV format
      const headers = [
        "ID",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Source Language",
        "Target Language",
        "City",
        "State",
        "ZIP",
        "Metro",
        "Years Experience",
        "Hourly Rate",
        "Certification",
        "Proficiency",
        "Available",
        "Rating",
      ];

      const rows = results.interpreters.map((i: any) => [
        i.id,
        i.firstName,
        i.lastName,
        i.email,
        i.phone,
        i.sourceLanguage,
        i.targetLanguage,
        i.city,
        i.state,
        i.zip,
        i.metro || "",
        i.yearsOfExperience || 0,
        i.hourlyRate || 0,
        i.certificationType || "",
        i.proficiencyLevel || "",
        i.isAvailable ? "Yes" : "No",
        i.rating || 0,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      return { csv: csvContent, count: results.total };
    }),

  /**
   * Create availability slot
   */
  createAvailabilitySlot: protectedProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createAvailabilitySlot(input);
    }),

  /**
   * Get interpreter availability
   */
  getInterpreterAvailability: publicProcedure
    .input(z.object({ interpreterId: z.number() }))
    .query(async ({ input }) => {
      return await db.getInterpreterAvailability(input.interpreterId);
    }),

  /**
   * Delete availability slot
   */
  deleteAvailabilitySlot: protectedProcedure
    .input(z.object({ slotId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteAvailabilitySlot(input.slotId);
    }),

  /**
   * Check booking conflict
   */
  checkBookingConflict: publicProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        scheduledDate: z.string(),
        duration: z.number(),
      })
    )
    .query(async ({ input }) => {
       return await db.checkBookingConflict(
        input.interpreterId,
        new Date(input.scheduledDate),
        input.duration
      );
    }),

  /**
   * Import interpreters from CSV
   */
  importInterpretersCSV: protectedProcedure
    .input(
      z.object({
        csvData: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const lines = input.csvData.split("\n").filter(line => line.trim());
      if (lines.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CSV file is empty or has no data rows",
        });
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      let success = 0;
      let failed = 0;

      // Process each row (skip header)
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(",").map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
          });

          // Basic validation
          if (!row.name || !row.email || !row.phone) {
            failed++;
            continue;
          }

          // Split name into first and last
          const nameParts = row.name.split(" ");
          const firstName = nameParts[0] || "Unknown";
          const lastName = nameParts.slice(1).join(" ") || "Unknown";

          // Insert interpreter
          await db.createInterpreter({
            firstName,
            lastName,
            email: row.email,
            phone: row.phone,
            sourceLanguage: row.sourcelanguage || "English",
            targetLanguage: row.targetlanguage || "Spanish",
            city: row.city || "",
            state: row.state || "",
            metro: row.metroarea || "",
            zipCode: row.zipcode || "",
          });
          success++;
        } catch (error) {
          failed++;
        }
      }

      return { success, failed };
    }),
  
  /**
   * Admin procedures for interpreter verification
   */
  admin: router({
    getInterpretersForVerification: protectedProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Check if user is admin
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        return await db.getInterpretersForVerification(input.status);
      }),
    
    updateInterpreterStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'rejected']),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user is admin
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        return await db.updateInterpreterStatus(input.id, input.status);
      }),
  }),

  /**
   * Create availability request (public - no auth required)
   */
  createAvailabilityRequest: publicProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        interpreterEmail: z.string().email(),
        interpreterName: z.string(),
        clientName: z.string().min(1),
        clientEmail: z.string().email(),
        clientPhone: z.string().optional(),
        requestedDate: z.string(), // ISO date string
        requestedTime: z.string(),
        duration: z.number().min(15).max(480), // 15 min to 8 hours
        location: z.string().min(1),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const requestedDate = new Date(input.requestedDate);
      
      return await availabilityRequestsDb.createAvailabilityRequest({
        ...input,
        requestedDate,
      });
    }),

  /**
   * Confirm or decline availability request (public - uses token)
   */
  updateAvailabilityRequest: publicProcedure
    .input(
      z.object({
        confirmationToken: z.string(),
        action: z.enum(['confirm', 'decline']),
        interpreterNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await availabilityRequestsDb.updateAvailabilityRequest(input);
    }),
});

export type AppRouter = typeof appRouter;
