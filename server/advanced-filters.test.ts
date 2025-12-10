import { describe, it, expect } from "vitest";
import { searchInterpreters } from "./db";

describe("Advanced Search Filters", () => {
  it("should filter by certification type", async () => {
    const results = await searchInterpreters({
      certificationType: "Medical",
      limit: 10,
      offset: 0,
    });

    expect(results).toBeDefined();
    expect(results.interpreters).toBeDefined();
    expect(Array.isArray(results.interpreters)).toBe(true);
    expect(typeof results.total).toBe('number');
  });

  it("should filter by years of experience range", async () => {
    const results = await searchInterpreters({
      minExperience: 5,
      maxExperience: 15,
      limit: 10,
      offset: 0,
    });

    expect(results).toBeDefined();
    expect(results.interpreters).toBeDefined();
    expect(Array.isArray(results.interpreters)).toBe(true);
    expect(typeof results.total).toBe('number');
  });

  it("should filter by hourly rate range", async () => {
    const results = await searchInterpreters({
      minRate: 50,
      maxRate: 150,
      limit: 10,
      offset: 0,
    });

    expect(results).toBeDefined();
    expect(results.interpreters).toBeDefined();
    expect(Array.isArray(results.interpreters)).toBe(true);
    expect(typeof results.total).toBe('number');
  });

  it("should filter by proficiency level", async () => {
    const results = await searchInterpreters({
      proficiencyLevel: "Professional",
      limit: 10,
      offset: 0,
    });

    expect(results).toBeDefined();
    expect(results.interpreters).toBeDefined();
    expect(Array.isArray(results.interpreters)).toBe(true);
    expect(typeof results.total).toBe('number');
  });

  it("should combine multiple advanced filters", async () => {
    const results = await searchInterpreters({
      certificationType: "Legal",
      minExperience: 3,
      proficiencyLevel: "Native",
      limit: 10,
      offset: 0,
    });

    expect(results).toBeDefined();
    expect(results.interpreters).toBeDefined();
    expect(Array.isArray(results.interpreters)).toBe(true);
    expect(typeof results.total).toBe('number');
  });

  it("should combine advanced filters with basic filters", async () => {
    const results = await searchInterpreters({
      sourceLanguage: "Spanish",
      certificationType: "Medical",
      minRate: 40,
      maxRate: 100,
      availableOnly: true,
      limit: 10,
      offset: 0,
    });

    expect(results).toBeDefined();
    expect(results.interpreters).toBeDefined();
    expect(Array.isArray(results.interpreters)).toBe(true);
    expect(typeof results.total).toBe('number');
  });
});
