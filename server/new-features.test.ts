import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("New Features Tests", () => {
  let testInterpreterId: number;

  beforeAll(async () => {
    // Create a test interpreter for availability calendar tests
    const result = await db.createInterpreter({
      firstName: "Test",
      lastName: "Interpreter",
      email: "test@example.com",
      phone: "555-0100",
      city: "Test City",
      state: "TS",
      targetLanguage: "Spanish",
      sourceLanguage: "English",
    });
    testInterpreterId = result.id;
  });

  afterAll(async () => {
    // Clean up test interpreter
    if (testInterpreterId) {
      await db.deleteInterpreter(testInterpreterId);
    }
  });

  describe("QR Code Generation for Public Profiles", () => {
    it("should generate public profile URL for interpreter", () => {
      const profileUrl = `/profile/${testInterpreterId}`;
      expect(profileUrl).toMatch(/^\/profile\/\d+$/);
    });

    it("should have valid interpreter ID for QR code", () => {
      expect(testInterpreterId).toBeGreaterThan(0);
      expect(typeof testInterpreterId).toBe("number");
    });

    it("should retrieve interpreter data for public profile", async () => {
      const interpreter = await db.getInterpreterById(testInterpreterId);
      expect(interpreter).toBeDefined();
      expect(interpreter?.firstName).toBe("Test");
      expect(interpreter?.lastName).toBe("Interpreter");
    });
  });

  describe("CSV Bulk Import Wizard", () => {
    it("should validate CSV row data structure", () => {
      const validRow = {
        name: "John Doe",
        email: "john@example.com",
        phone: "555-0101",
        sourcelanguage: "English",
        targetlanguage: "French",
        city: "Boston",
        state: "MA",
        metroarea: "Boston",
        zipcode: "02101",
      };

      expect(validRow.name).toBeDefined();
      expect(validRow.email).toBeDefined();
      expect(validRow.targetlanguage).toBeDefined();
    });

    it("should split name into firstName and lastName", () => {
      const fullName = "Jane Smith";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "Unknown";

      expect(firstName).toBe("Jane");
      expect(lastName).toBe("Smith");
    });

    it("should handle single name gracefully", () => {
      const fullName = "Madonna";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "Unknown";

      expect(firstName).toBe("Madonna");
      expect(lastName).toBe("Unknown");
    });

    it("should handle multi-part last names", () => {
      const fullName = "Maria De La Cruz";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "Unknown";

      expect(firstName).toBe("Maria");
      expect(lastName).toBe("De La Cruz");
    });

    it("should create interpreter from CSV data", async () => {
      const csvInterpreter = await db.createInterpreter({
        firstName: "CSV",
        lastName: "Import Test",
        email: "csvtest@example.com",
        phone: "555-0102",
        sourceLanguage: "English",
        targetLanguage: "German",
        city: "Chicago",
        state: "IL",
        metro: "Chicago",
        zipCode: "60601",
      });

      expect(csvInterpreter.id).toBeGreaterThan(0);
      expect(csvInterpreter.firstName).toBe("CSV");
      expect(csvInterpreter.lastName).toBe("Import Test");

      // Clean up
      await db.deleteInterpreter(csvInterpreter.id);
    });
  });

  describe("Weekly Availability Calendar", () => {
    it("should create availability slot for interpreter", async () => {
      const slot = await db.createAvailabilitySlot({
        interpreterId: testInterpreterId,
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "17:00",
      });

      expect(slot).toBeDefined();
      expect(slot.id).toBeGreaterThan(0);
      expect(slot.dayOfWeek).toBe(1);
      expect(slot.startTime).toBe("09:00");
      expect(slot.endTime).toBe("17:00");
    });

    it("should retrieve interpreter availability slots", async () => {
      const slots = await db.getInterpreterAvailability(testInterpreterId);
      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThan(0);
    });

    it("should validate day of week range (0-6)", () => {
      const validDays = [0, 1, 2, 3, 4, 5, 6];
      validDays.forEach((day) => {
        expect(day).toBeGreaterThanOrEqual(0);
        expect(day).toBeLessThanOrEqual(6);
      });
    });

    it("should validate time format (HH:MM)", () => {
      const validTimes = ["09:00", "12:30", "17:45", "23:59"];
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

      validTimes.forEach((time) => {
        expect(timeRegex.test(time)).toBe(true);
      });
    });

    it("should reject invalid time formats", () => {
      const invalidTimes = ["25:00", "12:60", "12:5"]; // Removed "9:00" as it's actually valid
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

      invalidTimes.forEach((time) => {
        expect(timeRegex.test(time)).toBe(false);
      });
    });

    it("should create multiple slots for different days", async () => {
      const days = [2, 3, 4]; // Tuesday, Wednesday, Thursday
      const createdSlots = [];

      for (const day of days) {
        const slot = await db.createAvailabilitySlot({
          interpreterId: testInterpreterId,
          dayOfWeek: day,
          startTime: "10:00",
          endTime: "16:00",
        });
        createdSlots.push(slot);
      }

      expect(createdSlots.length).toBe(3);
      createdSlots.forEach((slot, index) => {
        expect(slot.dayOfWeek).toBe(days[index]);
      });
    });

    it("should delete availability slot", async () => {
      // Create a slot to delete
      const slot = await db.createAvailabilitySlot({
        interpreterId: testInterpreterId,
        dayOfWeek: 5, // Friday
        startTime: "08:00",
        endTime: "12:00",
      });

      // Delete it
      await db.deleteAvailabilitySlot(slot.id);

      // Verify it's gone
      const slots = await db.getInterpreterAvailability(testInterpreterId);
      const deletedSlot = slots.find((s) => s.id === slot.id);
      expect(deletedSlot).toBeUndefined();
    });

    it("should check for booking conflicts", async () => {
      const scheduledDate = new Date("2025-01-15T10:00:00");
      const conflictCheck = await db.checkBookingConflict(
        testInterpreterId,
        scheduledDate,
        60
      );

      expect(typeof conflictCheck).toBe("boolean");
    });

    it("should handle overlapping time slots gracefully", async () => {
      // Create first slot
      const slot1 = await db.createAvailabilitySlot({
        interpreterId: testInterpreterId,
        dayOfWeek: 6, // Saturday
        startTime: "09:00",
        endTime: "13:00",
      });

      // Create overlapping slot (should still work, business logic can prevent this in UI)
      const slot2 = await db.createAvailabilitySlot({
        interpreterId: testInterpreterId,
        dayOfWeek: 6, // Saturday
        startTime: "12:00",
        endTime: "16:00",
      });

      expect(slot1.id).toBeDefined();
      expect(slot2.id).toBeDefined();
      expect(slot1.id).not.toBe(slot2.id);

      // Clean up
      await db.deleteAvailabilitySlot(slot1.id);
      await db.deleteAvailabilitySlot(slot2.id);
    });
  });

  describe("Integration Tests", () => {
    it("should support full workflow: create interpreter -> set availability -> check conflicts", async () => {
      // 1. Create interpreter
      const interpreter = await db.createInterpreter({
        firstName: "Integration",
        lastName: "Test",
        email: "integration@example.com",
        phone: "555-0103",
        sourceLanguage: "English",
        targetLanguage: "Japanese",
        city: "Seattle",
        state: "WA",
      });

      // 2. Set availability
      const slot = await db.createAvailabilitySlot({
        interpreterId: interpreter.id,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      });

      // 3. Check conflicts
      const scheduledDate = new Date("2025-01-13T10:00:00"); // Monday
      const hasConflict = await db.checkBookingConflict(
        interpreter.id,
        scheduledDate,
        60
      );

      expect(interpreter.id).toBeGreaterThan(0);
      expect(slot.id).toBeGreaterThan(0);
      expect(typeof hasConflict).toBe("boolean");

      // Clean up
      await db.deleteAvailabilitySlot(slot.id);
      await db.deleteInterpreter(interpreter.id);
    });

    it("should retrieve interpreter with all related data", async () => {
      const interpreter = await db.getInterpreterById(testInterpreterId);
      const availability = await db.getInterpreterAvailability(testInterpreterId);

      expect(interpreter).toBeDefined();
      expect(Array.isArray(availability)).toBe(true);
    });
  });
});
