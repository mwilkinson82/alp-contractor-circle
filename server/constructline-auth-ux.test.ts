import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const betaAuthSource = readFileSync(resolve(__dirname, "betaAuth.ts"), "utf-8");
const betaLoginSource = readFileSync(
  resolve(__dirname, "..", "client", "src", "pages", "BetaLogin.tsx"),
  "utf-8"
);
const betaSignupSource = readFileSync(
  resolve(__dirname, "..", "client", "src", "pages", "BetaSignup.tsx"),
  "utf-8"
);
const landingSource = readFileSync(
  resolve(
    __dirname,
    "..",
    "client",
    "src",
    "pages",
    "ConstructLineLanding.tsx"
  ),
  "utf-8"
);
const resetSource = readFileSync(
  resolve(__dirname, "..", "client", "src", "pages", "BetaPasswordReset.tsx"),
  "utf-8"
);

describe("ConstructLine auth recovery UX", () => {
  it("returns stable auth error codes for client recovery flows", () => {
    expect(betaAuthSource).toContain('code: "ACCOUNT_EXISTS"');
    expect(betaAuthSource).toContain('code: "INVALID_CREDENTIALS"');
    expect(betaAuthSource).toContain(
      "Check spam if it does not show up in a minute or two."
    );
  });

  it("lets failed login users request a password reset without leaving the page", () => {
    expect(betaLoginSource).toContain("requestResetLink");
    expect(betaLoginSource).toContain("Email reset link");
    expect(betaLoginSource).toContain("/api/beta/password-reset/request");
  });

  it("pre-fills password reset from the login or signup email", () => {
    expect(resetSource).toContain('searchParams.get("email")');
    expect(betaLoginSource).toContain("/constructline/reset-password?email=");
    expect(betaSignupSource).toContain("/constructline/reset-password?email=");
    expect(landingSource).toContain("/constructline/reset-password?email=");
  });

  it("turns duplicate signup into sign-in and reset choices", () => {
    expect(betaSignupSource).toContain('errorCode === "ACCOUNT_EXISTS"');
    expect(landingSource).toContain('errorCode === "ACCOUNT_EXISTS"');
    expect(betaSignupSource).toContain("Reset password");
    expect(landingSource).toContain("Reset password");
  });
});
