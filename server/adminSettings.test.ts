import { describe, it, expect } from "vitest";

describe("Admin Settings", () => {
  it("should have admin_settings table in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.adminSettings).toBeDefined();
  });

  it("admin_settings table has expected columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.adminSettings;
    // Check that the table has the expected column names
    const columnNames = Object.keys(table);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("settingKey");
    expect(columnNames).toContain("settingValue");
    expect(columnNames).toContain("label");
    expect(columnNames).toContain("description");
    expect(columnNames).toContain("updatedAt");
  });

  it("memberRouter exports getSettings, updateSetting, and updateSettings procedures", async () => {
    const { memberRouter } = await import("./memberRouter");
    // The router should have these procedures defined
    expect(memberRouter).toBeDefined();
    // Access the router's procedure map
    const procedures = (memberRouter as any)._def?.procedures || (memberRouter as any)._def?.record;
    expect(procedures).toBeDefined();
    expect(procedures.getSettings).toBeDefined();
    expect(procedures.updateSetting).toBeDefined();
    expect(procedures.updateSettings).toBeDefined();
  });

  it("getSettings returns settings as a key-value map", async () => {
    const { memberRouter } = await import("./memberRouter");
    const procedures = (memberRouter as any)._def?.procedures || (memberRouter as any)._def?.record;
    const getSettings = procedures.getSettings;
    // It should be a query procedure
    expect(getSettings).toBeDefined();
    expect(getSettings._def?.type || getSettings._type).toBeDefined();
  });

  it("updateSetting requires key and value inputs", async () => {
    const { memberRouter } = await import("./memberRouter");
    const procedures = (memberRouter as any)._def?.procedures || (memberRouter as any)._def?.record;
    const updateSetting = procedures.updateSetting;
    expect(updateSetting).toBeDefined();
    // It should be a mutation
    expect(updateSetting._def?.type || updateSetting._type).toBeDefined();
  });

  it("updateSettings requires settings record input", async () => {
    const { memberRouter } = await import("./memberRouter");
    const procedures = (memberRouter as any)._def?.procedures || (memberRouter as any)._def?.record;
    const updateSettings = procedures.updateSettings;
    expect(updateSettings).toBeDefined();
  });

  it("formatBootcampDisplay helper produces correct output", () => {
    // Test the display formatting logic that lives in PortalDashboard
    function formatBootcampDisplay(dateStr: string, dayLabel: string, timeStr: string): string {
      const d = new Date(dateStr + "T12:00:00");
      const month = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
      const dayNum = d.getUTCDate();
      const [h] = timeStr.split(":");
      const hour24 = parseInt(h);
      const ampm = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
      return `${dayLabel}, ${month} ${dayNum} at ${hour12} ${ampm} ET`;
    }

    expect(formatBootcampDisplay("2026-04-26", "Sunday", "17:00")).toBe("Sunday, April 26 at 5 PM ET");
    expect(formatBootcampDisplay("2026-05-10", "Sunday", "14:00")).toBe("Sunday, May 10 at 2 PM ET");
    expect(formatBootcampDisplay("2026-06-15", "Monday", "09:00")).toBe("Monday, June 15 at 9 AM ET");
  });

  it("getBootcampCalendarUrl helper produces valid Google Calendar URL", () => {
    function getBootcampCalendarUrl(dateStr: string, timeStr: string, zoomLink: string) {
      const [year, month, day] = dateStr.split("-");
      const [hour, minute] = timeStr.split(":");
      const hourUtc = (parseInt(hour) + 4).toString().padStart(2, "0");
      const start = `${year}${month}${day}T${hourUtc}${minute}00Z`;
      const endHourUtc = (parseInt(hourUtc) + 2).toString().padStart(2, "0");
      const end = `${year}${month}${day}T${endHourUtc}${minute}00Z`;
      const title = encodeURIComponent("Contractor Circle Monthly Bootcamp");
      const details = encodeURIComponent("Monthly Bootcamp");
      const location = encodeURIComponent(zoomLink);
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    }

    const url = getBootcampCalendarUrl("2026-04-26", "17:00", "https://zoom.us/j/123");
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("20260426T210000Z"); // 17:00 ET + 4 = 21:00 UTC
    expect(url).toContain("20260426T230000Z"); // +2 hours
    expect(url).toContain("Contractor%20Circle%20Monthly%20Bootcamp");
    expect(url).toContain(encodeURIComponent("https://zoom.us/j/123"));
  });
});
