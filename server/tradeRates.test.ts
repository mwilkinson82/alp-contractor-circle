import { describe, expect, it } from "vitest";

import {
  getBaseWage,
  getResolvedBaseWage,
  resolveTradeRoleKey,
} from "../shared/tradeRates";

describe("trade rate crew role resolution", () => {
  it("maps legacy concrete journeyman crew rows to a concrete role with a base wage", () => {
    expect(resolveTradeRoleKey("Concrete", "journeyman")).toBe("finisher");
    expect(getResolvedBaseWage("Concrete", "journeyman", "com_open")).toBe(
      getBaseWage("Concrete", "finisher", "com_open")
    );
  });

  it("maps legacy concrete apprentice crew rows to concrete labor instead of zero wage", () => {
    expect(resolveTradeRoleKey("Concrete", "apprentice_2")).toBe("laborer");
    expect(getResolvedBaseWage("Concrete", "apprentice_2", "com_open")).toBe(
      getBaseWage("Concrete", "laborer", "com_open")
    );
  });

  it("uses contractor overrides after resolving legacy crew role keys", () => {
    const userRates = new Map<string, number>([["Concrete|finisher", 7777]]);

    expect(getResolvedBaseWage("Concrete", "journeyman", "com_open", userRates)).toBe(7777);
  });

  it("keeps exact contractor overrides ahead of default trade rates", () => {
    const userRates = new Map<string, number>([["Concrete|foreman", 8888]]);

    expect(getResolvedBaseWage("Concrete", "foreman", "com_open", userRates)).toBe(8888);
  });
});
