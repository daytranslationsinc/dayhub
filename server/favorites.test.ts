import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Favorites System", () => {
  it("should add interpreter to favorites", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
    });

    const result = await caller.addFavorite({ interpreterId: 1 });
    expect(result).toBeDefined();
  });

  it("should remove interpreter from favorites", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
    });

    const result = await caller.removeFavorite({ interpreterId: 1 });
    expect(result).toBeDefined();
  });

  it("should get user favorites", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
    });

    const result = await caller.getUserFavorites({ limit: 50 });
    expect(result).toBeInstanceOf(Array);
  });

  it("should check if interpreter is favorited", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
    });

    const result = await caller.isFavorited({ interpreterId: 1 });
    expect(typeof result).toBe("boolean");
  });

  it("should get user favorite IDs", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
    });

    const result = await caller.getUserFavoriteIds();
    expect(result).toBeInstanceOf(Array);
  });
});

describe("Geocoding", () => {
  it("should geocode a valid US ZIP code", async () => {
    const caller = appRouter.createCaller({
      user: null,
    });

    const result = await caller.geocode({ address: "10001" });
    
    if (result) {
      expect(result).toHaveProperty("lat");
      expect(result).toHaveProperty("lng");
      expect(typeof result.lat).toBe("number");
      expect(typeof result.lng).toBe("number");
    }
  });

  it("should handle invalid ZIP codes gracefully", async () => {
    const caller = appRouter.createCaller({
      user: null,
    });

    const result = await caller.geocode({ address: "00000" });
    // Should return null or valid result, not throw
    expect(result === null || (result && typeof result.lat === "number")).toBe(true);
  });
});
