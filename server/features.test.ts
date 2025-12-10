import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("New Features Tests", () => {
  describe("Proximity Search", () => {
    it("should search interpreters with ZIP code and radius", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        zipCode: "10001", // New York
        radius: 25,
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("should return interpreters without ZIP filter", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe("Review System", () => {
    it("should get reviews for an interpreter", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.getReviews({
        interpreterId: 1,
        limit: 10,
      });

      expect(result).toBeInstanceOf(Array);
    });

    it("should require authentication to submit review", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      await expect(
        caller.submitReview({
          interpreterId: 1,
          rating: 5,
          comment: "Great interpreter!",
        })
      ).rejects.toThrow();
    });

    it("should submit review when authenticated", async () => {
      const caller = appRouter.createCaller({
        user: {
          id: 1,
          openId: "test-user",
          name: "Test User",
          email: "test@example.com",
          role: "user",
          createdAt: new Date(),
        },
      });

      const result = await caller.submitReview({
        interpreterId: 1,
        rating: 5,
        comment: "Excellent service!",
      });

      expect(result).toBeDefined();
    });

    it("should validate rating range (1-5)", async () => {
      const caller = appRouter.createCaller({
        user: {
          id: 1,
          openId: "test-user",
          name: "Test User",
          email: "test@example.com",
          role: "user",
          createdAt: new Date(),
        },
      });

      await expect(
        caller.submitReview({
          interpreterId: 1,
          rating: 6, // Invalid rating
          comment: "Test",
        })
      ).rejects.toThrow();

      await expect(
        caller.submitReview({
          interpreterId: 1,
          rating: 0, // Invalid rating
          comment: "Test",
        })
      ).rejects.toThrow();
    });
  });

  describe("Search Filters", () => {
    it("should filter by source language", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        sourceLanguage: "English",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
    });

    it("should filter by target language", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        targetLanguage: "Spanish",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
    });

    it("should filter by metro area", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        metro: "New York-Newark-Jersey City, NY-NJ-PA",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
    });

    it("should filter by state", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        state: "NY",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
    });
  });

  describe("Database Helpers", () => {
    it("should get all languages", async () => {
      const languages = await db.getAllLanguages();
      expect(languages).toBeInstanceOf(Array);
      expect(languages.length).toBeGreaterThan(0);
    });

    it("should get all metros", async () => {
      const metros = await db.getAllMetros();
      expect(metros).toBeInstanceOf(Array);
      expect(metros.length).toBeGreaterThan(0);
    });

    it("should get all states", async () => {
      const states = await db.getAllStates();
      expect(states).toBeInstanceOf(Array);
      expect(states.length).toBeGreaterThan(0);
    });

    it("should get interpreter by ID", async () => {
      const interpreter = await db.getInterpreterById(1);
      expect(interpreter).toBeDefined();
      if (interpreter) {
        expect(interpreter.id).toBe(1);
        expect(interpreter.firstName).toBeDefined();
        expect(interpreter.lastName).toBeDefined();
      }
    });
  });
});
