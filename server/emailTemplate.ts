/**
 * Contractor Circle — Reusable Email Template
 * 
 * Dark-luxury memo style, Gmail-safe (HTML tables, inline CSS, bulletproof buttons).
 * Modular: header, hero/memo, body, pull quote, CTA/offer block, footer.
 * 
 * Color palette (email-safe):
 *   Primary bg:    #0B0C0E
 *   Card bg:       #151619
 *   Body text:     #F7F2EA
 *   Secondary:     #C9C1B8
 *   Muted:         #A8A099
 *   Gold accent:   #D99A4A
 *   Gold button:   #E6A348
 *   Button text:   #111111
 * 
 * Typography:
 *   Headings: Georgia (Playfair Display not safe for email)
 *   Body: 'Inter', Helvetica, Arial, sans-serif
 */

// ─── Color constants ────────────────────────────────────────────────────────
const C = {
  bg: "#0B0C0E",
  card: "#151619",
  text: "#F7F2EA",
  secondary: "#C9C1B8",
  muted: "#A8A099",
  gold: "#D99A4A",
  goldBtn: "#E6A348",
  btnText: "#111111",
  divider: "rgba(217,154,74,0.3)",
  cardBorder: "rgba(255,255,255,0.06)",
} as const;

const FONT_HEADING = "Georgia, 'Times New Roman', serif";
const FONT_BODY = "'Inter', Helvetica, Arial, sans-serif";

const JOIN_URL = "https://alpcontractorcircle.com/join";
const SOCIAL = {
  discord: "https://discord.gg/rsK5HZcF",
  youtube: "https://www.youtube.com/@marshallwilkinson",
  linkedin: "https://www.linkedin.com/in/marshallwilkinson/",
  instagram: "https://instagram.com/realmarshallwilkinson",
};

// ─── Module builders ────────────────────────────────────────────────────────

/** 1. EMAIL HEADER — Logo, brand name, environment tag */
function headerModule(): string {
  return `
<!-- Header -->
<tr>
  <td style="padding:24px 32px 16px 32px;border-bottom:1px solid ${C.cardBorder};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${FONT_HEADING};font-size:18px;font-weight:700;color:${C.text};letter-spacing:1px;">
        CONTRACTOR CIRCLE
      </td>
      <td align="right" style="font-family:${FONT_BODY};font-size:10px;letter-spacing:2px;color:${C.gold};text-transform:uppercase;font-weight:600;">
        PRIVATE IMPLEMENTATION ENVIRONMENT
      </td>
    </tr></table>
  </td>
</tr>`;
}

/** 2. HERO / MEMO BLOCK — Eyebrow, headline, subheadline */
export function heroModule(opts: {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
}): string {
  const eyebrowHtml = opts.eyebrow
    ? `<p style="margin:0 0 8px 0;font-family:${FONT_BODY};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:600;">${opts.eyebrow}</p>`
    : "";
  const subHtml = opts.subheadline
    ? `<p style="margin:12px 0 0 0;font-family:${FONT_BODY};font-size:15px;color:${C.secondary};line-height:1.6;">${opts.subheadline}</p>`
    : "";

  return `
<!-- Hero -->
<tr>
  <td style="padding:28px 32px 24px 32px;background-color:rgba(255,255,255,0.02);border-bottom:1px solid ${C.cardBorder};">
    ${eyebrowHtml}
    <p style="margin:0;font-family:${FONT_HEADING};font-size:26px;font-weight:700;color:${C.text};line-height:1.3;">${opts.headline}</p>
    <div style="width:40px;height:3px;background:${C.gold};border-radius:2px;margin-top:12px;"></div>
    ${subHtml}
  </td>
</tr>`;
}

/** 3. EMAIL LETTER / BODY — Main email copy (accepts raw HTML) */
export function bodyModule(bodyHtml: string): string {
  return `
<!-- Body -->
<tr>
  <td style="padding:28px 32px;font-family:${FONT_HEADING};font-size:16px;line-height:1.85;color:${C.text};">
    ${bodyHtml}
  </td>
</tr>`;
}

/** 4. PULL QUOTE — Highlight a key message */
export function pullQuoteModule(quote: string): string {
  return `
<!-- Pull Quote -->
<tr>
  <td style="padding:0 32px 24px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:rgba(217,154,74,0.08);border-left:4px solid ${C.gold};border-radius:0 8px 8px 0;padding:20px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:${FONT_HEADING};font-size:28px;color:${C.gold};padding-right:12px;vertical-align:top;line-height:1;">&ldquo;</td>
            <td style="font-family:${FONT_HEADING};font-size:15px;font-style:italic;color:${C.text};line-height:1.7;">${quote}</td>
          </tr></table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

/** 5. CTA / OFFER BLOCK — Value statement + bulletproof button */
export function ctaModule(opts: {
  headline?: string;
  subtext?: string;
  buttonText?: string;
  buttonUrl?: string;
}): string {
  const hl = opts.headline || "Ready to build the operating system?";
  const sub = opts.subtext || "Join Contractor Circle for $497/month.<br/>Founding rate locked while active. Cancel anytime.";
  const btnText = opts.buttonText || "JOIN CONTRACTOR CIRCLE →";
  const btnUrl = opts.buttonUrl || JOIN_URL;

  return `
<!-- CTA Block -->
<tr>
  <td style="padding:0 32px 28px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:rgba(255,255,255,0.03);border:1px solid ${C.cardBorder};border-radius:12px;padding:28px 24px;text-align:center;">
          <p style="margin:0 0 8px 0;font-family:${FONT_HEADING};font-size:18px;font-weight:700;color:${C.text};">${hl}</p>
          <div style="width:30px;height:2px;background:${C.gold};border-radius:1px;margin:0 auto 12px auto;"></div>
          <p style="margin:0 0 20px 0;font-family:${FONT_BODY};font-size:14px;color:${C.secondary};line-height:1.6;">${sub}</p>
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${btnUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="17%" strokecolor="${C.goldBtn}" fillcolor="${C.goldBtn}">
            <w:anchorlock/>
            <center style="color:${C.btnText};font-family:${FONT_BODY};font-size:14px;font-weight:700;letter-spacing:1px;">${btnText}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${btnUrl}" style="display:inline-block;background-color:${C.goldBtn};color:${C.btnText};text-decoration:none;padding:14px 32px;border-radius:8px;font-family:${FONT_BODY};font-size:14px;font-weight:700;letter-spacing:1px;">${btnText}</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

/** 6. EMAIL FOOTER — Brand, social links, compliance */
function footerModule(): string {
  const iconStyle = "display:inline-block;width:28px;height:28px;border-radius:50%;background-color:rgba(255,255,255,0.06);text-align:center;line-height:28px;font-size:13px;text-decoration:none;color:" + C.secondary + ";margin:0 4px;";

  return `
<!-- Footer -->
<tr>
  <td style="padding:24px 32px;border-top:1px solid ${C.cardBorder};text-align:center;">
    <p style="margin:0 0 4px 0;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.text};letter-spacing:1px;">CONTRACTOR CIRCLE</p>
    <p style="margin:0 0 16px 0;font-family:${FONT_BODY};font-size:11px;color:${C.muted};letter-spacing:1px;">Private Implementation Environment</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td><a href="${SOCIAL.discord}" style="${iconStyle}" title="Discord">D</a></td>
      <td><a href="${SOCIAL.youtube}" style="${iconStyle}" title="YouTube">Y</a></td>
      <td><a href="${SOCIAL.linkedin}" style="${iconStyle}" title="LinkedIn">L</a></td>
      <td><a href="${SOCIAL.instagram}" style="${iconStyle}" title="Instagram">I</a></td>
    </tr></table>
    <p style="margin:16px 0 0 0;font-family:${FONT_BODY};font-size:11px;color:${C.muted};line-height:1.6;">
      You're receiving this email because you signed up for updates from Contractor Circle.
    </p>
    {{UNSUB_PLACEHOLDER}}
  </td>
</tr>`;
}

// ─── Paragraph + signature helpers ──────────────────────────────────────────

/** Styled paragraph */
export function p(text: string): string {
  return `<p style="margin:0 0 16px 0;color:${C.text};">${text}</p>`;
}

/** Short line break paragraph (for single-line emphasis) */
export function pShort(text: string): string {
  return `<p style="margin:0 0 8px 0;color:${C.text};">${text}</p>`;
}

/** Secondary/muted paragraph */
export function pMuted(text: string): string {
  return `<p style="margin:0 0 16px 0;color:${C.secondary};">${text}</p>`;
}

/** Bold inline text */
export function b(text: string): string {
  return `<strong style="color:${C.text};">${text}</strong>`;
}

/** Gold-colored inline text */
export function gold(text: string): string {
  return `<span style="color:${C.gold};font-weight:600;">${text}</span>`;
}

/** Inline link */
export function link(text: string, url: string): string {
  return `<a href="${url}" style="color:${C.gold};text-decoration:none;border-bottom:1px solid ${C.divider};">${text}</a>`;
}

/** Bullet list from array of strings */
export function bulletList(items: string[]): string {
  return items.map(item => `<p style="margin:0 0 6px 0;color:${C.text};padding-left:16px;">• ${item}</p>`).join("\n");
}

/** Offer stack item: bold title + description */
export function offerItem(title: string, desc: string): string {
  return `<p style="margin:0 0 4px 0;"><strong style="color:${C.text};font-family:${FONT_BODY};font-size:14px;">${title}</strong></p>
<p style="margin:0 0 16px 0;color:${C.secondary};font-family:${FONT_BODY};font-size:14px;line-height:1.6;">${desc}</p>`;
}

/** Simple sign-off */
export function sig(): string {
  return `<div style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:0;font-family:${FONT_BODY};font-size:14px;font-weight:600;color:${C.text};">Marshall</p>
  </div>`;
}

/** Full sign-off with title */
export function sigFull(): string {
  return `<div style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:0;font-family:${FONT_BODY};font-size:14px;font-weight:600;color:${C.text};">Marshall Wilkinson</p>
    <p style="margin:4px 0 0 0;font-family:${FONT_BODY};font-size:12px;color:${C.muted};letter-spacing:0.5px;">Founder, ALP</p>
  </div>`;
}

// ─── Main template wrapper ──────────────────────────────────────────────────

export interface EmailTemplateOpts {
  preheaderText?: string;
  hero?: {
    eyebrow?: string;
    headline: string;
    subheadline?: string;
  };
  bodyHtml: string;
  pullQuote?: string;
  cta?: {
    headline?: string;
    subtext?: string;
    buttonText?: string;
    buttonUrl?: string;
  } | false;
}

/**
 * Build a full Contractor Circle branded email.
 * 
 * Usage:
 *   buildCCEmail({
 *     preheaderText: "Use this on your last estimate...",
 *     hero: { eyebrow: "THE ESTIMATOR'S CHECKLIST", headline: "Your checklist is ready." },
 *     bodyHtml: p("Hey Marshall —") + p("..."),
 *     pullQuote: "The checklist is the tool. Contractor Circle is the operating system.",
 *     cta: { headline: "Ready?", buttonText: "JOIN CONTRACTOR CIRCLE →" },
 *   });
 */
export function buildCCEmail(opts: EmailTemplateOpts): string {
  const preheader = opts.preheaderText
    ? `<div style="display:none;font-size:1px;color:${C.bg};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${opts.preheaderText}</div>`
    : "";

  const heroHtml = opts.hero ? heroModule(opts.hero) : "";
  const quoteHtml = opts.pullQuote ? pullQuoteModule(opts.pullQuote) : "";
  const ctaHtml = opts.cta !== false ? ctaModule(opts.cta || {}) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <!--<![endif]-->
  <title>Contractor Circle</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:${FONT_BODY};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.bg};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${C.card};border-radius:12px;overflow:hidden;">
          ${headerModule()}
          ${heroHtml}
          ${bodyModule(opts.bodyHtml)}
          ${quoteHtml}
          ${ctaHtml}
          ${footerModule()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build a simple body-only email (no hero, no CTA block).
 * Used for early-sequence emails that should feel personal, not salesy.
 */
export function buildCCSimpleEmail(opts: {
  preheaderText?: string;
  bodyHtml: string;
}): string {
  return buildCCEmail({
    preheaderText: opts.preheaderText,
    bodyHtml: opts.bodyHtml,
    cta: false,
  });
}
