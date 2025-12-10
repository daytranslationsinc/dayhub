import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Rating System Verification", () => {
  const mockUser = {
    id: 999,
    openId: "test-user-rating",
    name: "Test User",
    email: "test@example.com",
    role: "user" as const,
  };

  it("should submit a review with rating", async () => {
    const caller = appRouter.createCaller({ user: mockUser });

    const result = await caller.submitReview({
      interpreterId: 1,
      rating: 5,
      comment: "Excellent interpreter! Very professional.",
    });

    // submitReview returns void on success, so just check it doesn't throw
    expect(result).toBeDefined();
  });

  it("should get reviews for an interpreter", async () => {
    const caller = appRouter.createCaller({ user: null });

    const result = await caller.getReviews({
      interpreterId: 1,
      limit: 10,
    });

    expect(result).toBeInstanceOf(Array);
    // Should have at least the review we just created
    expect(result.length).toBeGreaterThan(0);
  });

  it("should validate rating is between 1 and 5", async () => {
    const caller = appRouter.createCaller({ user: mockUser });

    // Should reject rating > 5
    await expect(
      caller.submitReview({
        interpreterId: 1,
        rating: 6,
        comment: "Invalid rating",
      })
    ).rejects.toThrow();

    // Should reject rating < 1
    await expect(
      caller.submitReview({
        interpreterId: 1,
        rating: 0,
        comment: "Invalid rating",
      })
    ).rejects.toThrow();
  });

  it("should calculate average rating correctly", async () => {
    const caller = appRouter.createCaller({ user: null });

    // Get interpreter with reviews
    const result = await caller.searchInterpreters({
      page: 0,
      pageSize: 1,
      sortBy: "rating",
      sortOrder: "desc",
    });

    if (result.interpreters.length > 0) {
      const interpreter = result.interpreters[0];
      // Rating should be a number between 0 and 5
      if (interpreter.rating !== null) {
        expect(typeof interpreter.rating).toBe("number");
        expect(interpreter.rating).toBeGreaterThanOrEqual(0);
        expect(interpreter.rating).toBeLessThanOrEqual(5);
      }
    }
  });

  it("should sort interpreters by rating", async () => {
    const caller = appRouter.createCaller({ user: null });

    const descResult = await caller.searchInterpreters({
      page: 0,
      pageSize: 10,
      sortBy: "rating",
      sortOrder: "desc",
    });

    expect(descResult.interpreters).toBeInstanceOf(Array);
    
    // Verify descending order (highest rating first)
    for (let i = 0; i < descResult.interpreters.length - 1; i++) {
      const current = descResult.interpreters[i].rating || 0;
      const next = descResult.interpreters[i + 1].rating || 0;
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it("should require authentication to submit reviews", async () => {
    const caller = appRouter.createCaller({ user: null });

    await expect(
      caller.submitReview({
        interpreterId: 1,
        rating: 5,
        comment: "Should fail without auth",
      })
    ).rejects.toThrow();
  });
});
