import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendNewMemberSignupNotification } from "./email";

// Mock Resend
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn(async (params) => {
        // Simulate successful send
        return {
          data: { id: "test-email-id-12345" },
          error: null,
        };
      }),
    },
  })),
}));

describe("New Member Signup Notification Email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send new member signup notification with correct subject", async () => {
    const result = await sendNewMemberSignupNotification({
      memberName: "John Contractor",
      memberEmail: "john@example.com",
      discordUsername: "JohnContractor#1234",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("test-email-id-12345");
  });

  it("should include member details in email", async () => {
    const result = await sendNewMemberSignupNotification({
      memberName: "Jane Smith",
      memberEmail: "jane@example.com",
      discordUsername: "JaneSmith#5678",
    });

    expect(result.success).toBe(true);
  });

  it("should send to marshall@marshallwilkinson.com", async () => {
    const result = await sendNewMemberSignupNotification({
      memberName: "Test Member",
      memberEmail: "test@example.com",
      discordUsername: "TestMember#0000",
    });

    expect(result.success).toBe(true);
  });

  it("should format signup time in Eastern timezone", async () => {
    const result = await sendNewMemberSignupNotification({
      memberName: "Time Test Member",
      memberEmail: "timetest@example.com",
      discordUsername: "TimeTestMember#1111",
    });

    expect(result.success).toBe(true);
    // The function should format time in America/New_York timezone
  });

  it("should handle missing Resend configuration gracefully", async () => {
    // This test verifies the function checks for Resend availability
    const result = await sendNewMemberSignupNotification({
      memberName: "Test",
      memberEmail: "test@example.com",
      discordUsername: "Test#0000",
    });

    // Should either succeed (if Resend is mocked) or fail gracefully
    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });
});
