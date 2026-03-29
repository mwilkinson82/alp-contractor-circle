/**
 * Templates URL validation tests
 * Ensures all template URLs point to Google Docs/Sheets/Drive with /copy or /view
 */
import { describe, expect, it } from "vitest";

/**
 * Complete template catalog — all 18 templates with their Google Drive URLs.
 * Google Docs and Sheets use /copy to force members to make their own copy.
 * PDFs use /view since they cannot be copied in Google Drive.
 */
const TEMPLATES = [
  { id: "1", name: "Contractor Proposal Template", url: "https://docs.google.com/document/d/17KrgZQsLo4ZBxxSu5bFUpOlMgaViD6PixxHeNbnYksM/copy", type: "google-doc", category: "proposals", featured: true },
  { id: "2", name: "Construction Agreement Template", url: "https://docs.google.com/document/d/1ci08CJ9aIgScwtibkLOoVoDX75pav--5gs4VTq5hxZY/copy", type: "google-doc", category: "contracts", featured: false },
  { id: "3", name: "Follow-Up Email Scripts", url: "https://docs.google.com/document/d/1TxuHOv6lrnMUlpijQuhzPfiUEyjbEZUaiIN076AV85Q/copy", type: "google-doc", category: "sales", featured: true },
  { id: "4", name: "Objection Reframing Guide", url: "https://docs.google.com/document/d/1KLLh8yFUk5ZK51v5kpnsvT_YJMvnMWakZZ8i0FyjGSA/copy", type: "google-doc", category: "sales", featured: true },
  { id: "5", name: "Bid Sheet & Estimating Template", url: "https://docs.google.com/spreadsheets/d/11Relq2cAVntdPLCV74qRCbtvN1jjE2GUowZCETHP6h8/copy", type: "google-sheet", category: "finance", featured: true },
  { id: "6", name: "PM Systems Presentation", url: "https://drive.google.com/file/d/1vJ_DaziH4NkmrMjpZ1d3aw7IoH-om8xv/view", type: "pdf", category: "operations", featured: false },
  { id: "7", name: "PM Systems Spreadsheets", url: "https://docs.google.com/spreadsheets/d/14ZB8w1j8CO3DICRXXakxNE8mKbL_agEn0qWPJ7blWPk/copy", type: "google-sheet", category: "operations", featured: false },
  { id: "8", name: "Construction SOPs Template", url: "https://docs.google.com/document/d/1jjzpZba5u1sQUQ1lEJR3sYsn8jspKrt3z0xDpq8xXD0/copy", type: "google-doc", category: "operations", featured: true },
  { id: "9", name: "Construction Checklists", url: "https://docs.google.com/document/d/14i1hWbgHjJGhQJkFidc9xSqz00FPBk3tYm6NGKm3SIo/copy", type: "google-doc", category: "operations", featured: true },
  { id: "10", name: "Subcontractor & Vendor Management SOPs", url: "https://docs.google.com/document/d/1mMquQmg0mxKyrgma8CnLOFehrhAngsiEKv0KEFd6hBk/copy", type: "google-doc", category: "operations", featured: true },
  { id: "11", name: "Client Communication & Sales Follow-Up SOPs", url: "https://docs.google.com/document/d/1HBVZ3oyuLoRQfOJeDSPtTiPjsAN-_mpndM80G4tLmL0/copy", type: "google-doc", category: "sales", featured: true },
  { id: "12", name: "Subcontractor Agreement", url: "https://docs.google.com/document/d/1QhSBhvGoUpz-q6uXmauYItUPLgyaZVDTTu0ReJHtk1M/copy", type: "google-doc", category: "contracts", featured: false },
  { id: "13", name: "Daily Job Log / Field Report", url: "https://docs.google.com/document/d/1ZqB1XsJfTvIIrblJfPQ47pzT-kkNH8tSpcbQmvg1qZE/copy", type: "google-doc", category: "operations", featured: false },
  { id: "14", name: "Change Order Template", url: "https://docs.google.com/document/d/1GGVY7EsAZ3bk68XxUFdHXaLnKKaowgoMzbPTx2VbqSs/copy", type: "google-doc", category: "contracts", featured: false },
  { id: "15", name: "Client Onboarding Checklist", url: "https://docs.google.com/document/d/1bVZFRRw8D0zqWQfdiVugV8p9L4-7sVAIsYu7sww3EDc/copy", type: "google-doc", category: "operations", featured: false },
  { id: "16", name: "Construction Punch List", url: "https://docs.google.com/spreadsheets/d/1_jwNpKsmTqHuNAN8HMwKhPBIAW3mOmK5IkZYh2rUXYw/copy", type: "google-sheet", category: "operations", featured: false },
  { id: "17", name: "Construction Invoice", url: "https://docs.google.com/spreadsheets/d/1yWC3qJq0ew1Sw5P3zTigm0l-fcPqldAI_sIouHNEF0o/copy", type: "google-sheet", category: "finance", featured: false },
  { id: "18", name: "Roles & Responsibilities Framework", url: "https://docs.google.com/document/d/1H5_dKbrSgwTpKD7lxK4i3dsjMJvnhCs2sg3l3f4AZHk/copy", type: "google-doc", category: "operations", featured: true },
  { id: "19", name: "CPM Scheduling — The Financial Weapon", url: "https://drive.google.com/file/d/1tcDTbADD3V7oIV72OJSvHBqKsFz9-DB8/view", type: "pdf", category: "operations", featured: false },
];

describe("Template Google Drive URLs", () => {
  it("all templates have valid Google Drive URLs", () => {
    for (const template of TEMPLATES) {
      expect(template.url).toBeTruthy();
      expect(template.url).toMatch(
        /^https:\/\/(docs\.google\.com\/(document|spreadsheets)\/d\/|drive\.google\.com\/file\/d\/)/,
      );
    }
  });

  it("Google Docs and Sheets use /copy to force members to save their own copy", () => {
    const copyableTemplates = TEMPLATES.filter((t) => t.type !== "pdf");
    for (const template of copyableTemplates) {
      expect(template.url).toMatch(/\/copy$/);
    }
  });

  it("PDF templates use /view instead of /copy", () => {
    const pdfTemplates = TEMPLATES.filter((t) => t.type === "pdf");
    expect(pdfTemplates.length).toBeGreaterThan(0);
    for (const template of pdfTemplates) {
      expect(template.url).toMatch(/\/view$/);
    }
  });

  it("all 19 templates are present", () => {
    expect(TEMPLATES).toHaveLength(19);
  });

  it("template IDs are unique", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("template names are unique", () => {
    const names = TEMPLATES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("template URLs are unique", () => {
    const urls = TEMPLATES.map((t) => t.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("all expected categories are represented", () => {
    const categories = new Set(TEMPLATES.map((t) => t.category));
    expect(categories.has("proposals")).toBe(true);
    expect(categories.has("contracts")).toBe(true);
    expect(categories.has("sales")).toBe(true);
    expect(categories.has("finance")).toBe(true);
    expect(categories.has("operations")).toBe(true);
  });

  it("file types are only google-doc, google-sheet, or pdf", () => {
    const validTypes = new Set(["google-doc", "google-sheet", "pdf"]);
    for (const template of TEMPLATES) {
      expect(validTypes.has(template.type)).toBe(true);
    }
  });

  it("Google Docs use docs.google.com/document/ URLs", () => {
    const docs = TEMPLATES.filter((t) => t.type === "google-doc");
    for (const doc of docs) {
      expect(doc.url).toMatch(/^https:\/\/docs\.google\.com\/document\/d\//);
    }
  });

  it("Google Sheets use docs.google.com/spreadsheets/ URLs", () => {
    const sheets = TEMPLATES.filter((t) => t.type === "google-sheet");
    for (const sheet of sheets) {
      expect(sheet.url).toMatch(/^https:\/\/docs\.google\.com\/spreadsheets\/d\//);
    }
  });

  it("PDFs use drive.google.com/file/ URLs", () => {
    const pdfs = TEMPLATES.filter((t) => t.type === "pdf");
    for (const pdf of pdfs) {
      expect(pdf.url).toMatch(/^https:\/\/drive\.google\.com\/file\/d\//);
    }
  });
});
