import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Interpreter Database Operations", () => {
  let testInterpreterId: number;

  beforeAll(async () => {
    // Create a test interpreter
    const result = await db.createInterpreter({
      firstName: "Test",
      lastName: "Interpreter",
      phone: "(555) 123-4567",
      email: "test@example.com",
      city: "Test City",
      state: "TS",
      country: "USA",
      metro: "Test Metro Area",
      lat: "40.7128",
      lng: "-74.0060",
      sourceLanguage: "English",
      targetLanguage: "Spanish",
      zipCode: "10001",
      specialties: ["Medical", "Legal"],
      certifications: "Test Certification",
      notes: "This is a test interpreter",
      source: "Test",
    });

    // Get the inserted ID
    const interpreters = await db.searchInterpreters({
      query: "test@example.com",
      limit: 1,
    });
    testInterpreterId = interpreters.interpreters[0]?.id || 0;
  });

  afterAll(async () => {
    // Clean up test interpreter
    if (testInterpreterId) {
      await db.hardDeleteInterpreter(testInterpreterId);
    }
  });

  describe("searchInterpreters", () => {
    it("should return interpreters with basic search", async () => {
      const result = await db.searchInterpreters({
        limit: 10,
      });

      expect(result).toHaveProperty("interpreters");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("hasMore");
      expect(Array.isArray(result.interpreters)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(result.total).toBeGreaterThan(0);
    });

    it("should filter by language", async () => {
      const result = await db.searchInterpreters({
        language: "Spanish",
        limit: 50,
      });

      expect(result.interpreters.length).toBeGreaterThan(0);
      // Check that at least one interpreter has Spanish
      const hasSpanish = result.interpreters.some((i) => i.targetLanguage === "Spanish");
      expect(hasSpanish).toBe(true);
    });

    it("should filter by city", async () => {
      const result = await db.searchInterpreters({
        city: "Miami",
        limit: 10,
      });

      if (result.interpreters.length > 0) {
        expect(result.interpreters[0].city).toContain("Miami");
      }
    });

    it("should filter by state", async () => {
      const result = await db.searchInterpreters({
        state: "CA",
        limit: 10,
      });

      if (result.interpreters.length > 0) {
        expect(result.interpreters[0].state).toBe("CA");
      }
    });

    it("should filter by metro area", async () => {
      const result = await db.searchInterpreters({
        metro: "Los Angeles",
        limit: 10,
      });

      if (result.interpreters.length > 0) {
        expect(result.interpreters[0].metro).toContain("Los Angeles");
      }
    });

    it("should support pagination", async () => {
      const page1 = await db.searchInterpreters({
        limit: 5,
        offset: 0,
      });

      const page2 = await db.searchInterpreters({
        limit: 5,
        offset: 5,
      });

      expect(page1.interpreters.length).toBeGreaterThan(0);
      expect(page2.interpreters.length).toBeGreaterThan(0);

      // Ensure different results
      if (page1.interpreters.length > 0 && page2.interpreters.length > 0) {
        expect(page1.interpreters[0].id).not.toBe(page2.interpreters[0].id);
      }
    });

    it("should support text search", async () => {
      const result = await db.searchInterpreters({
        query: "Test",
        limit: 10,
      });

      expect(result.interpreters.length).toBeGreaterThan(0);
      const found = result.interpreters.some(
        (i) =>
          i.firstName?.includes("Test") ||
          i.lastName?.includes("Test") ||
          i.email?.includes("test")
      );
      expect(found).toBe(true);
    });
  });

  describe("getInterpreterById", () => {
    it("should return interpreter by ID", async () => {
      const interpreter = await db.getInterpreterById(testInterpreterId);

      expect(interpreter).toBeTruthy();
      expect(interpreter?.id).toBe(testInterpreterId);
      expect(interpreter?.firstName).toBe("Test");
      expect(interpreter?.lastName).toBe("Interpreter");
    });

    it("should return null for non-existent ID", async () => {
      const interpreter = await db.getInterpreterById(999999);
      expect(interpreter).toBeNull();
    });
  });

  describe("getAllLanguages", () => {
    it("should return array of unique languages", async () => {
      const languages = await db.getAllLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain("Spanish");
      expect(languages).toContain("English");

      // Check for uniqueness
      const uniqueLanguages = [...new Set(languages)];
      expect(languages.length).toBe(uniqueLanguages.length);
    });
  });

  describe("getAllMetros", () => {
    it("should return array of unique metro areas", async () => {
      const metros = await db.getAllMetros();

      expect(Array.isArray(metros)).toBe(true);
      expect(metros.length).toBeGreaterThan(0);

      // Check for uniqueness
      const uniqueMetros = [...new Set(metros)];
      expect(metros.length).toBe(uniqueMetros.length);
    });
  });

  describe("getAllStates", () => {
    it("should return array of unique states", async () => {
      const states = await db.getAllStates();

      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBeGreaterThan(0);

      // Check for uniqueness
      const uniqueStates = [...new Set(states)];
      expect(states.length).toBe(uniqueStates.length);
    });
  });

  describe("getAllCities", () => {
    it("should return array of cities with states", async () => {
      const cities = await db.getAllCities();

      expect(Array.isArray(cities)).toBe(true);
      expect(cities.length).toBeGreaterThan(0);

      if (cities.length > 0) {
        expect(cities[0]).toHaveProperty("city");
        expect(cities[0]).toHaveProperty("state");
      }
    });
  });

  describe("updateInterpreter", () => {
    it("should update interpreter fields", async () => {
      await db.updateInterpreter(testInterpreterId, {
        notes: "Updated notes",
      });

      const updated = await db.getInterpreterById(testInterpreterId);
      expect(updated?.notes).toBe("Updated notes");
    });
  });

  describe("deleteInterpreter", () => {
    it("should soft delete interpreter", async () => {
      // Create a temporary interpreter for deletion test
      await db.createInterpreter({
        firstName: "Delete",
        lastName: "Test",
        email: "delete@test.com",
        targetLanguage: "English",
      });

      const search = await db.searchInterpreters({
        query: "delete@test.com",
        limit: 1,
      });

      const deleteId = search.interpreters[0]?.id;
      expect(deleteId).toBeTruthy();

      if (deleteId) {
        await db.deleteInterpreter(deleteId);

        const deleted = await db.getInterpreterById(deleteId);
        expect(deleted?.isActive).toBe(false);

        // Clean up
        await db.hardDeleteInterpreter(deleteId);
      }
    });
  });

  describe("getStats", () => {
    it("should return database statistics", async () => {
      const stats = await db.getStats();

      expect(stats).toHaveProperty("totalInterpreters");
      expect(stats).toHaveProperty("totalCalls");
      expect(stats).toHaveProperty("topMetros");

      expect(typeof stats.totalInterpreters).toBe("number");
      expect(stats.totalInterpreters).toBeGreaterThan(0);

      expect(Array.isArray(stats.topMetros)).toBe(true);
      if (stats.topMetros.length > 0) {
        expect(stats.topMetros[0]).toHaveProperty("metro");
        expect(stats.topMetros[0]).toHaveProperty("count");
      }
    });
  });
});
