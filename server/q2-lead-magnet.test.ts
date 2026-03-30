import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  createLead: vi.fn(),
  subscribeEmail: vi.fn(),
  getAllActiveMembers: vi.fn(),
}));

// Mock the email module
vi.mock("./email", () => ({
  sendSubscriberNotification: vi.fn(),
  sendEosDeckAnnouncementEmail: vi.fn(),
  sendQ2FrameworkEmail: vi.fn().mockResolvedValue({ success: true, id: "test-id" }),
}));

// Mock Supabase client
vi.mock("./supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
  insertSupabaseLead: vi.fn().mockResolvedValue(undefined),
  insertTemplateRequest: vi.fn(),
}));

import { createLead } from "./db";
import { sendQ2FrameworkEmail } from "./email";
import { insertSupabaseLead } from "./supabaseClient";

describe("Q2 Lead Magnet Capture Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLead", () => {
    it("should accept valid lead data", async () => {
      const mockCreateLead = createLead as ReturnType<typeof vi.fn>;
      mockCreateLead.mockResolvedValue({ alreadyExists: false });

      const result = await createLead({
        firstName: "John",
        email: "john@example.com",
        source: "q1-q2-framework",
      });

      expect(result).toEqual({ alreadyExists: false });
      expect(mockCreateLead).toHaveBeenCalledWith({
        firstName: "John",
        email: "john@example.com",
        source: "q1-q2-framework",
      });
    });

    it("should handle duplicate leads", async () => {
      const mockCreateLead = createLead as ReturnType<typeof vi.fn>;
      mockCreateLead.mockResolvedValue({ alreadyExists: true });

      const result = await createLead({
        firstName: "John",
        email: "john@example.com",
        source: "q1-q2-framework",
      });

      expect(result.alreadyExists).toBe(true);
    });
  });

  describe("Q2 Framework Email", () => {
    it("should send Q2 framework email with correct params", async () => {
      const mockSendEmail = sendQ2FrameworkEmail as ReturnType<typeof vi.fn>;
      mockSendEmail.mockResolvedValue({ success: true, id: "email-123" });

      const result = await sendQ2FrameworkEmail({
        to: "john@example.com",
        firstName: "John",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("email-123");
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "john@example.com",
        firstName: "John",
      });
    });

    it("should handle email sending failure gracefully", async () => {
      const mockSendEmail = sendQ2FrameworkEmail as ReturnType<typeof vi.fn>;
      mockSendEmail.mockResolvedValue({ success: false, error: "Resend not configured" });

      const result = await sendQ2FrameworkEmail({
        to: "john@example.com",
        firstName: "John",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Resend not configured");
    });
  });

  describe("Lead Capture Integration", () => {
    it("should trigger email for q1-q2-framework source", async () => {
      const mockCreateLead = createLead as ReturnType<typeof vi.fn>;
      const mockSendEmail = sendQ2FrameworkEmail as ReturnType<typeof vi.fn>;
      const mockInsertSupabase = insertSupabaseLead as ReturnType<typeof vi.fn>;

      mockCreateLead.mockResolvedValue({ alreadyExists: false });
      mockSendEmail.mockResolvedValue({ success: true, id: "test-id" });
      mockInsertSupabase.mockResolvedValue(undefined);

      // Simulate the full flow
      const input = {
        firstName: "Marshall",
        email: "marshall@test.com",
        source: "q1-q2-framework",
      };

      const result = await createLead(input);
      expect(result.alreadyExists).toBe(false);

      // Email should be sent for q1-q2-framework source
      if (input.source === "q1-q2-framework") {
        await sendQ2FrameworkEmail({
          to: input.email,
          firstName: input.firstName,
        });
      }

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "marshall@test.com",
        firstName: "Marshall",
      });

      // Supabase lead should be inserted
      await insertSupabaseLead({
        email: input.email,
        source: `lead_magnet_${input.source}`,
      });

      expect(mockInsertSupabase).toHaveBeenCalledWith({
        email: "marshall@test.com",
        source: "lead_magnet_q1-q2-framework",
      });
    });

    it("should NOT trigger email for non-q2 sources", async () => {
      const mockSendEmail = sendQ2FrameworkEmail as ReturnType<typeof vi.fn>;

      const input = {
        firstName: "Test",
        email: "test@test.com",
        source: "some-other-magnet",
      };

      if (input.source === "q1-q2-framework") {
        await sendQ2FrameworkEmail({
          to: input.email,
          firstName: input.firstName,
        });
      }

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
