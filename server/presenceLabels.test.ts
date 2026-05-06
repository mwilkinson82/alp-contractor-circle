import { describe, expect, it } from "vitest";
import { describePresenceWindow, formatPresencePage, formatPresenceWork } from "../shared/presenceLabels";

describe("presence labels", () => {
  it("labels Basis project work distinctly from the Bid Desk", () => {
    expect(formatPresencePage("/portal/takeoff")).toBe("Basis Bid Desk");
    expect(formatPresencePage("/portal/takeoff/750006")).toBe("ConstructLine Basis");
    expect(formatPresenceWork("/portal/takeoff/750006")).toBe("Working inside a Basis estimate");
  });

  it("labels libraries as Basis inputs", () => {
    expect(formatPresencePage("/portal/cost-library")).toBe("Basis Cost Library");
    expect(formatPresencePage("/portal/labor-library")).toBe("Basis Trade Rate Library");
  });

  it("labels Baseline schedule desk and cockpit routes", () => {
    expect(formatPresencePage("/portal/scheduler")).toBe("Baseline");
    expect(formatPresenceWork("/portal/scheduler")).toBe("Reviewing Baseline schedules");
    expect(formatPresencePage("/scheduler/42")).toBe("ConstructLine Baseline");
    expect(formatPresenceWork("/scheduler/42")).toBe("Working inside a Baseline schedule");
  });

  it("describes heartbeat windows in human language", () => {
    expect(describePresenceWindow(45)).toBe("seen in the last 45 seconds");
    expect(describePresenceWindow(120)).toBe("seen in the last 2 minutes");
  });
});
