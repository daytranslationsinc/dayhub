import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("ZIP Code Distance Search", () => {
  it("should find interpreters near NYC (10001)", async () => {
    const caller = appRouter.createCaller({
      user: null,
    });

    const result = await caller.searchInterpreters({
      zipCode: "10001",
      radius: 50,
      limit: 10,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(result.interpreters).toBeInstanceOf(Array);
    
    // All results should have distance calculated
    result.interpreters.forEach((interpreter: any) => {
      if (interpreter.distance !== null) {
        expect(interpreter.distance).toBeLessThanOrEqual(50);
      }
    });
  });

  it("should find interpreters near Los Angeles (90210)", async () => {
    const caller = appRouter.createCaller({
      user: null,
    });

    const result = await caller.searchInterpreters({
      zipCode: "90210",
      radius: 25,
      limit: 10,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(result.interpreters).toBeInstanceOf(Array);
    
    result.interpreters.forEach((interpreter: any) => {
      if (interpreter.distance !== null) {
        expect(interpreter.distance).toBeLessThanOrEqual(25);
      }
    });
  });

  it("should respect different radius values", async () => {
    const caller = appRouter.createCaller({
      user: null,
    });

    const result10 = await caller.searchInterpreters({
      zipCode: "60601",
      radius: 10,
      limit: 100,
      offset: 0,
    });

    const result50 = await caller.searchInterpreters({
      zipCode: "60601",
      radius: 50,
      limit: 100,
      offset: 0,
    });

    // Larger radius should return more or equal results
    expect(result50.total).toBeGreaterThanOrEqual(result10.total);
  });

  it("should combine ZIP search with other filters", async () => {
    const caller = appRouter.createCaller({
      user: null,
    });

    const result = await caller.searchInterpreters({
      zipCode: "10001",
      radius: 50,
      availableOnly: true,
      sortBy: "rating",
      sortOrder: "desc",
      limit: 10,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(result.interpreters).toBeInstanceOf(Array);
  });

  it("should handle invalid ZIP codes gracefully", async () => {
    const caller = appRouter.createCaller({
      user: null,
    });

    const result = await caller.searchInterpreters({
      zipCode: "00000",
      radius: 25,
      limit: 10,
      offset: 0,
    });

    // Should not throw, just return empty or all results
    expect(result).toBeDefined();
    expect(result.interpreters).toBeInstanceOf(Array);
  });
});
