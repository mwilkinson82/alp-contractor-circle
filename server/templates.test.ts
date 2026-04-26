/**
 * Templates catalog validation tests
 * Ensures all 26 templates are present with valid URLs and correct categories.
 * Google Docs and Sheets use /copy; PDFs use /view or CDN URLs.
 */
import { describe, expect, it } from "vitest";

const TEMPLATES = [
  { id: "1",  name: "Contractor Proposal Template",                    url: "https://docs.google.com/document/d/17KrgZQsLo4ZBxxSu5bFUpOlMgaViD6PixxHeNbnYksM/copy", type: "google-doc",   category: "proposals" },
  { id: "2",  name: "Construction Agreement Template",                 url: "https://docs.google.com/document/d/1ci08CJ9aIgScwtibkLOoVoDX75pav--5gs4VTq5hxZY/copy", type: "google-doc",   category: "contracts" },
  { id: "3",  name: "Follow-Up Email Scripts",                         url: "https://docs.google.com/document/d/1TxuHOv6lrnMUlpijQuhzPfiUEyjbEZUaiIN076AV85Q/copy", type: "google-doc",   category: "sales" },
  { id: "4",  name: "Objection Reframing Guide",                       url: "https://docs.google.com/document/d/1KLLh8yFUk5ZK51v5kpnsvT_YJMvnMWakZZ8i0FyjGSA/copy", type: "google-doc",   category: "sales" },
  { id: "5",  name: "Bid Sheet & Estimating Template",                 url: "https://docs.google.com/spreadsheets/d/11Relq2cAVntdPLCV74qRCbtvN1jjE2GUowZCETHP6h8/copy", type: "google-sheet", category: "finance" },
  { id: "6",  name: "PM Systems Presentation",                         url: "https://drive.google.com/file/d/1vJ_DaziH4NkmrMjpZ1d3aw7IoH-om8xv/view",                type: "pdf",          category: "operations" },
  { id: "7",  name: "PM Systems Spreadsheets",                         url: "https://docs.google.com/spreadsheets/d/14ZB8w1j8CO3DICRXXakxNE8mKbL_agEn0qWPJ7blWPk/copy", type: "google-sheet", category: "operations" },
  { id: "8",  name: "Construction SOPs Template",                      url: "https://docs.google.com/document/d/1jjzpZba5u1sQUQ1lEJR3sYsn8jspKrt3z0xDpq8xXD0/copy", type: "google-doc",   category: "operations" },
  { id: "9",  name: "Construction Checklists",                         url: "https://docs.google.com/document/d/14i1hWbgHjJGhQJkFidc9xSqz00FPBk3tYm6NGKm3SIo/copy", type: "google-doc",   category: "operations" },
  { id: "10", name: "Subcontractor & Vendor Management SOPs",          url: "https://docs.google.com/document/d/1mMquQmg0mxKyrgma8CnLOFehrhAngsiEKv0KEFd6hBk/copy", type: "google-doc",   category: "operations" },
  { id: "11", name: "Client Communication & Sales Follow-Up SOPs",     url: "https://docs.google.com/document/d/1HBVZ3oyuLoRQfOJeDSPtTiPjsAN-_mpndM80G4tLmL0/copy", type: "google-doc",   category: "sales" },
  { id: "12", name: "Presentation from Call #1: EOS for Contractors",  url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/ALP_Contractor_Circle_Inaugural_Call_FINAL_v2_a286e410.pdf", type: "pdf", category: "contractor_circle" },
  { id: "13", name: "The Estimator's Checklist",                       url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Construction_Estimating_Checklist_be88d436.pdf", type: "pdf", category: "estimating" },
  { id: "14", name: "Change Order Template",                           url: "https://docs.google.com/document/d/1GGVY7EsAZ3bk68XxUFdHXaLnKKaowgoMzbPTx2VbqSs/copy", type: "google-doc",   category: "contracts" },
  { id: "15", name: "Client Onboarding Checklist",                     url: "https://docs.google.com/document/d/1bVZFRRw8D0zqWQfdiVugV8p9L4-7sVAIsYu7sww3EDc/copy", type: "google-doc",   category: "operations" },
  { id: "16", name: "Construction Punch List",                         url: "https://docs.google.com/spreadsheets/d/1_jwNpKsmTqHuNAN8HMwKhPBIAW3mOmK5IkZYh2rUXYw/copy", type: "google-sheet", category: "operations" },
  { id: "17", name: "Construction Invoice",                            url: "https://docs.google.com/spreadsheets/d/1yWC3qJq0ew1Sw5P3zTigm0l-fcPqldAI_sIouHNEF0o/copy", type: "google-sheet", category: "finance" },
  { id: "18", name: "Roles & Responsibilities Framework",              url: "https://docs.google.com/document/d/1H5_dKbrSgwTpKD7lxK4i3dsjMJvnhCs2sg3l3f4AZHk/copy", type: "google-doc",   category: "operations" },
  { id: "19", name: "CPM Scheduling — The Financial Weapon",           url: "https://drive.google.com/file/d/1tcDTbADD3V7oIV72OJSvHBqKsFz9-DB8/view",                type: "pdf",          category: "operations" },
  { id: "20", name: "ALP/EOS Operating System — Complete Playbook",    url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/ALP_EOS_Playbook_65c0ba61.pdf", type: "pdf", category: "operations" },
  { id: "21", name: "ALP/EOS Scorecard",                               url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/eos_data_handout_Scorecard_df3edffe.pdf", type: "pdf", category: "operations" },
  { id: "22", name: "Subcontractor Agreement",                         url: "https://docs.google.com/document/d/1QhSBhvGoUpz-q6uXmauYItUPLgyaZVDTTu0ReJHtk1M/copy", type: "google-doc",   category: "contracts" },
  { id: "23", name: "Daily Job Log / Field Report",                    url: "https://docs.google.com/document/d/1ZqB1XsJfTvIIrblJfPQ47pzT-kkNH8tSpcbQmvg1qZE/copy", type: "google-doc",   category: "operations" },
  { id: "24", name: "Subcontractor Bid Submittal Form",                url: "https://docs.google.com/document/d/1IWR5H9w7EvJ7kNpMC8i85IH8loUfvJ8xKgHq4tio2lI/copy", type: "google-doc",   category: "estimating" },
  { id: "25", name: "ALP/EOS Vision/Traction Organizer (V/TO)",        url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/ALP_EOS_Toolkit_VITO_63e29d87.pdf", type: "pdf", category: "operations" },
  { id: "26", name: "Presentation from Call #2: Your Business is Your Biggest Asset", url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/ALP_Call2_Your_Biggest_Asset_a98da66c.pdf", type: "pdf", category: "contractor_circle" },
  { id: "27", name: "The Three Silos Framework", url: "/manus-storage/ALP_Three_Silos_Framework_v3_3ba50529.pdf", type: "pdf", category: "operations" },
  { id: "28", name: "EOS Component Connection Map", url: "/manus-storage/ALP_EOS_Component_Connection_Map_0a3bdbab.pdf", type: "pdf", category: "operations" },
  { id: "29", name: "Project Manager Meeting — Weekly Process & Deliverables", url: "/manus-storage/ProjectManagerMeetingGraphic_7d272ed6.png", type: "pdf", category: "operations" },
  { id: "30", name: "Project Financial & Schedule Overview — Job Cost Ledger", url: "/manus-storage/ProjectManagerDashboard_9dde9526.png", type: "pdf", category: "operations" },
];

describe("Template Catalog", () => {
  it("all 30 templates are present", () => {
    expect(TEMPLATES).toHaveLength(30);
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

  it("all templates have valid URLs", () => {
    for (const template of TEMPLATES) {
      expect(template.url).toBeTruthy();
      expect(template.url).toMatch(/^(https:\/\/|\/manus-storage\/)/);
    }
  });

  it("Google Docs use /copy URLs", () => {
    const docs = TEMPLATES.filter((t) => t.type === "google-doc");
    for (const doc of docs) {
      expect(doc.url).toMatch(/\/copy$/);
    }
  });

  it("Google Sheets use /copy URLs", () => {
    const sheets = TEMPLATES.filter((t) => t.type === "google-sheet");
    for (const sheet of sheets) {
      expect(sheet.url).toMatch(/\/copy$/);
    }
  });

  it("PDFs use /view or CDN URLs", () => {
    const pdfs = TEMPLATES.filter((t) => t.type === "pdf");
    expect(pdfs.length).toBeGreaterThan(0);
    for (const pdf of pdfs) {
      const isViewUrl = pdf.url.endsWith("/view");
      const isCdnUrl = pdf.url.includes("cloudfront.net");
      const isManusStorage = pdf.url.includes("/manus-storage/");
      expect(isViewUrl || isCdnUrl || isManusStorage).toBe(true);
    }
  });

  it("all expected categories are represented", () => {
    const categories = new Set(TEMPLATES.map((t) => t.category));
    expect(categories.has("proposals")).toBe(true);
    expect(categories.has("contracts")).toBe(true);
    expect(categories.has("sales")).toBe(true);
    expect(categories.has("finance")).toBe(true);
    expect(categories.has("operations")).toBe(true);
    expect(categories.has("estimating")).toBe(true);
    expect(categories.has("contractor_circle")).toBe(true);
  });

  it("file types are only google-doc, google-sheet, or pdf", () => {
    const validTypes = new Set(["google-doc", "google-sheet", "pdf"]);
    for (const template of TEMPLATES) {
      expect(validTypes.has(template.type)).toBe(true);
    }
  });

  it("contractor_circle category has both call decks", () => {
    const circleDeck = TEMPLATES.filter((t) => t.category === "contractor_circle");
    expect(circleDeck).toHaveLength(2);
    expect(circleDeck.some((t) => t.name.includes("Call #1"))).toBe(true);
    expect(circleDeck.some((t) => t.name.includes("Call #2"))).toBe(true);
  });
});
