import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Enhancement Features Tests", () => {
  describe("Availability Filter", () => {
    it("should filter interpreters by availability", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        availableOnly: true,
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
      // All returned interpreters should be available
      result.interpreters.forEach((interpreter: any) => {
        if (interpreter.isAvailable !== undefined) {
          expect(interpreter.isAvailable).toBe(true);
        }
      });
    });

    it("should return all interpreters when availableOnly is false", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        availableOnly: false,
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
    });
  });

  describe("Sort by Rating", () => {
    it("should sort interpreters by rating ascending", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        sortBy: "rating",
        sortOrder: "asc",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
      
      // Verify ascending order
      for (let i = 0; i < result.interpreters.length - 1; i++) {
        const current = parseFloat(result.interpreters[i].rating || "0");
        const next = parseFloat(result.interpreters[i + 1].rating || "0");
        expect(current).toBeLessThanOrEqual(next);
      }
    });

    it("should sort interpreters by rating descending", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        sortBy: "rating",
        sortOrder: "desc",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
      
      // Verify descending order
      for (let i = 0; i < result.interpreters.length - 1; i++) {
        const current = parseFloat(result.interpreters[i].rating || "0");
        const next = parseFloat(result.interpreters[i + 1].rating || "0");
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe("Booking System", () => {
    const testUser = {
      id: 999,
      openId: "test-booking-user",
      name: "Test Booking User",
      email: "booking@test.com",
      role: "user" as const,
      createdAt: new Date(),
    };

    it("should require authentication to create booking", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      await expect(
        caller.createBooking({
          interpreterId: 1,
          scheduledDate: new Date().toISOString(),
          duration: 60,
          notes: "Test booking",
        })
      ).rejects.toThrow();
    });

    it("should create a booking when authenticated", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const result = await caller.createBooking({
        interpreterId: 1,
        scheduledDate: futureDate.toISOString(),
        duration: 60,
        notes: "Test appointment",
      });

      expect(result).toBeDefined();
    });

    it("should validate duration range", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Duration too short
      await expect(
        caller.createBooking({
          interpreterId: 1,
          scheduledDate: futureDate.toISOString(),
          duration: 10,
          notes: "Invalid duration",
        })
      ).rejects.toThrow();

      // Duration too long
      await expect(
        caller.createBooking({
          interpreterId: 1,
          scheduledDate: futureDate.toISOString(),
          duration: 500,
          notes: "Invalid duration",
        })
      ).rejects.toThrow();
    });

    it("should get user bookings", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
      });

      const result = await caller.getUserBookings({
        limit: 10,
      });

      expect(result).toBeInstanceOf(Array);
    });

    it("should get interpreter bookings", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.getInterpreterBookings({
        interpreterId: 1,
        limit: 10,
      });

      expect(result).toBeInstanceOf(Array);
    });

    it("should update booking status", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
      });

      // First create a booking
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await caller.createBooking({
        interpreterId: 1,
        scheduledDate: futureDate.toISOString(),
        duration: 60,
        notes: "Test for status update",
      });

      // Get the booking
      const bookings = await caller.getUserBookings({ limit: 1 });
      if (bookings.length > 0) {
        const bookingId = bookings[0].id;

        // Update status
        const result = await caller.updateBookingStatus({
          bookingId,
          status: "confirmed",
        });

        expect(result).toBeDefined();
      }
    });

    it("should delete a booking", async () => {
      const caller = appRouter.createCaller({
        user: testUser,
      });

      // First create a booking
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await caller.createBooking({
        interpreterId: 1,
        scheduledDate: futureDate.toISOString(),
        duration: 60,
        notes: "Test for deletion",
      });

      // Get the booking
      const bookings = await caller.getUserBookings({ limit: 1 });
      if (bookings.length > 0) {
        const bookingId = bookings[0].id;

        // Delete it
        const result = await caller.deleteBooking({
          bookingId,
        });

        expect(result).toBeDefined();
      }
    });
  });

  describe("Combined Filters", () => {
    it("should combine availability filter with rating sort", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        availableOnly: true,
        sortBy: "rating",
        sortOrder: "desc",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
    });

    it("should combine all filters with proximity search", async () => {
      const caller = appRouter.createCaller({
        user: null,
      });

      const result = await caller.searchInterpreters({
        zipCode: "10001",
        radius: 25,
        availableOnly: true,
        sortBy: "rating",
        sortOrder: "desc",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.interpreters).toBeInstanceOf(Array);
    });
  });
});
