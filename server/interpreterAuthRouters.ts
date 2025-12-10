import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import * as interpreterAuth from "./interpreterAuth";
import { VALID_LANGUAGES, US_STATES, COUNTRIES, PROFICIENCY_LEVELS, CERTIFICATION_TYPES } from "../shared/validationData";

/**
 * Interpreter authentication and profile management router
 */
export const interpreterAuthRouter = router({
  /**
   * Send magic link login email to interpreter
   */
  requestLoginLink: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      return await interpreterAuth.sendInterpreterLoginLink(input.email);
    }),

  /**
   * Verify login token and get interpreter session
   */
  verifyLoginToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await interpreterAuth.verifyInterpreterLoginToken(input.token);
    }),

  /**
   * Get interpreter profile (requires valid token in context)
   */
  getProfile: publicProcedure
    .input(
      z.object({
        interpreterId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await interpreterAuth.getInterpreterProfile(input.interpreterId);
    }),

  /**
   * Update interpreter profile with validation
   */
  updateProfile: publicProcedure
    .input(
      z.object({
        interpreterId: z.number(),
        phone: z.string().optional(),
        city: z.string().optional(),
        state: z.enum(US_STATES.map(s => s.code) as [string, ...string[]]).optional(),
        country: z.enum(COUNTRIES as unknown as [string, ...string[]]).optional(),
        zipCode: z.string().optional(),
        sourceLanguage: z.enum(VALID_LANGUAGES as unknown as [string, ...string[]]).optional(),
        targetLanguage: z.enum(VALID_LANGUAGES as unknown as [string, ...string[]]).optional(),
        specialties: z.string().optional(),
        certifications: z.string().optional(),
        yearsOfExperience: z.number().min(0).max(50).optional(),
        hourlyRate: z.string().optional(),
        proficiencyLevel: z.enum(PROFICIENCY_LEVELS as unknown as [string, ...string[]]).optional(),
        profilePhotoUrl: z.string().url().optional(),
        resumeUrl: z.string().url().optional(),
        voiceClipUrl: z.string().url().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { interpreterId, ...updates } = input;
      return await interpreterAuth.updateInterpreterProfile(interpreterId, updates);
    }),

  /**
   * Get validation data for dropdowns
   */
  getValidationData: publicProcedure.query(() => {
    return {
      languages: VALID_LANGUAGES,
      usStates: US_STATES,
      countries: COUNTRIES,
      proficiencyLevels: PROFICIENCY_LEVELS,
      certificationTypes: CERTIFICATION_TYPES,
    };
  }),
});
