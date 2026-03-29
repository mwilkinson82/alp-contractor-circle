/**
 * Templates Page — Downloadable resources for Contractor Circle members.
 * All templates are real, battle-tested resources built through the ALP framework.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FileSpreadsheet,
  Search,
  Download,
  Star,
  FolderOpen,
  BookOpen,
  Target,
  Shield,
  BarChart3,
  CheckCircle2,
  X,
  Loader2,
  FileDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMember } from "@/hooks/useMember";
import { SubscriptionGate } from "@/components/portal/SubscriptionGate";
import { Send, Lightbulb, CheckCircle } from "lucide-react";

type TemplateCategory = "all" | "proposals" | "contracts" | "sales" | "operations" | "finance";

interface Template {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  category: Exclude<TemplateCategory, "all">;
  fileType: "pdf" | "docx" | "xlsx";
  downloadUrl: string;
  /** If set, the modal shows an "Access Document" button linking to Google Drive instead of a download button */
  googleDriveUrl?: string;
  featured?: boolean;
  badge?: string;
  highlights: string[];
  pages?: string;
}

const TEMPLATES: Template[] = [
  {
    id: "1",
    title: "Contractor Proposal Template",
    description: "10-section professional proposal with 3-tier pricing, scope of work, timeline, and built-in ALP authority positioning.",
    longDescription: "A complete 10-section proposal template built on the ALP framework. Includes cover page, personal note, project vision, scope of work, 3-tier investment options (Essential / Signature / Estate), payment schedule, project timeline, credentials, guarantee, and signature page. Every section includes coaching notes on how to fill it in.",
    category: "proposals",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/17KrgZQsLo4ZBxxSu5bFUpOlMgaViD6PixxHeNbnYksM/copy",
    googleDriveUrl: "https://docs.google.com/document/d/17KrgZQsLo4ZBxxSu5bFUpOlMgaViD6PixxHeNbnYksM/copy",
    featured: true,
    badge: "Most Used",
    pages: "10 sections",
    highlights: [
      "3-tier pricing structure (Essential / Signature / Estate)",
      "ALP authority positioning notes throughout",
      "Complete payment schedule with milestone triggers",
      "Built-in project timeline by phase",
      "Professional signature/agreement page",
    ],
  },
  {
    id: "2",
    title: "Construction Agreement Template",
    description: "10-article contractor agreement covering scope, payments, change orders, warranty, and dispute resolution.",
    longDescription: "A comprehensive construction contract template with 10 articles covering: scope of work with inclusions and exclusions, contract price and payment schedule, change order process, project schedule, materials and substitutions, permits and code compliance, warranty terms, insurance and liability, dispute resolution, and general provisions.",
    category: "contracts",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1ci08CJ9aIgScwtibkLOoVoDX75pav--5gs4VTq5hxZY/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1ci08CJ9aIgScwtibkLOoVoDX75pav--5gs4VTq5hxZY/copy",
    featured: false,
    badge: "Legal",
    pages: "10 articles",
    highlights: [
      "10 complete articles covering all project phases",
      "Change order process and authorization",
      "Warranty terms with response commitments",
      "Dispute resolution and contractor lien rights",
      "Professional signature page with tier selection",
    ],
  },
  {
    id: "3",
    title: "Follow-Up Email Scripts (7 Scripts)",
    description: "7 Authority Gap email scripts + 5 text message scripts. Covers Day 1 through Day 14 of the sales cycle.",
    longDescription: "The complete Authority Gap follow-up system. 7 email scripts timed from same-day through Day 14, plus 5 text message scripts. Each script is built around the three pillars: Authority, Familiarity, and Trust. Includes the Case Study email, Education email, Vision email, Operational Urgency email, Decision Framework email, and the Final Follow-Up.",
    category: "sales",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1TxuHOv6lrnMUlpijQuhzPfiUEyjbEZUaiIN076AV85Q/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1TxuHOv6lrnMUlpijQuhzPfiUEyjbEZUaiIN076AV85Q/copy",
    featured: true,
    badge: "Authority Gap",
    pages: "7 emails + 5 texts",
    highlights: [
      "7 complete email scripts with subject lines",
      "5 text message scripts",
      "Timing guide: Day 1 through Day 14",
      "Coach's notes on when and how to use each script",
      "Built on Authority, Familiarity, and Trust framework",
    ],
  },
  {
    id: "4",
    title: "Objection Reframing Guide",
    description: "The 4 core objections contractors face, reframed as 'next decisions.' Includes word-for-word scripts for each.",
    longDescription: "The ALP Objection Control system. Covers the 4 core objections: 'It's more than we expected,' 'We need to think about it,' 'Can you sharpen your pencil?', and 'I need to talk to my spouse.' Each objection includes: what they actually mean, the wrong response, the ALP response, the next decision to control, and 2–3 word-for-word scripts. Plus bonus section covering 4 additional objections.",
    category: "sales",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1KLLh8yFUk5ZK51v5kpnsvT_YJMvnMWakZZ8i0FyjGSA/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1KLLh8yFUk5ZK51v5kpnsvT_YJMvnMWakZZ8i0FyjGSA/copy",
    featured: true,
    badge: "Decision Control",
    pages: "4 core + 4 bonus",
    highlights: [
      "4 core objections with full handling scripts",
      "Wrong response vs. ALP response comparison",
      "Next decision framework for each objection",
      "4 bonus objections (lower bid, wait, more bids, payments)",
      "The Objection Control Formula: Identify → Determine → Direct",
    ],
  },
  {
    id: "5",
    title: "Bid Sheet & Estimating Template",
    description: "6-tab Excel estimating system with 100+ line items, 10 divisions, subcontractor bid comparison, and payment tracker.",
    longDescription: "A comprehensive construction estimating workbook with 6 tabs: Project Summary (with 3-tier pricing), Detail Estimate (100+ line items across 10 divisions), Subcontractor Bid Comparison, Change Order Log, Payment Tracker, and Instructions. All formulas are pre-built — enter quantities and unit costs, everything calculates automatically.",
    category: "finance",
    fileType: "xlsx",
    downloadUrl: "https://docs.google.com/spreadsheets/d/11Relq2cAVntdPLCV74qRCbtvN1jjE2GUowZCETHP6h8/copy",
    googleDriveUrl: "https://docs.google.com/spreadsheets/d/11Relq2cAVntdPLCV74qRCbtvN1jjE2GUowZCETHP6h8/copy",
    featured: true,
    badge: "Airtight",
    pages: "6 tabs, 100+ line items",
    highlights: [
      "100+ line items across 10 construction divisions",
      "Automatic labor, material, and subcontractor totals",
      "Overhead & profit calculator with margin controls",
      "3-tier pricing section for proposal presentation",
      "Subcontractor bid comparison + change order log",
    ],
  },
  {
    id: "6",
    title: "PM Systems Presentation",
    description: "Marshall's complete PM systems deck. The exact framework used to manage $2.5B+ in construction projects.",
    longDescription: "The Project Management Systems presentation deck — Marshall's complete framework for running construction projects at scale. Covers the systems, processes, and workflows that enabled $2.5B+ in construction. Use this as a training tool for your team or as a reference for building your own PM systems.",
    category: "operations",
    fileType: "pdf",
    downloadUrl: "https://drive.google.com/file/d/1vJ_DaziH4NkmrMjpZ1d3aw7IoH-om8xv/view",
    googleDriveUrl: "https://drive.google.com/file/d/1vJ_DaziH4NkmrMjpZ1d3aw7IoH-om8xv/view",
    featured: false,
    badge: "Marshall's System",
    pages: "Full presentation",
    highlights: [
      "Marshall's personal PM framework from $2.5B+ in construction",
      "Systems and processes for scaling your operation",
      "Team training and workflow documentation",
      "Reference guide for building your own PM systems",
    ],
  },
  {
    id: "7",
    title: "PM Systems Spreadsheets",
    description: "The companion spreadsheet toolkit to the PM Systems presentation. Ready-to-use tracking tools.",
    longDescription: "The companion spreadsheet toolkit to the PM Systems presentation deck. Includes the tracking tools, templates, and worksheets that go with Marshall's PM framework. Use alongside the presentation deck for a complete project management system.",
    category: "operations",
    fileType: "xlsx",
    downloadUrl: "https://docs.google.com/spreadsheets/d/14ZB8w1j8CO3DICRXXakxNE8mKbL_agEn0qWPJ7blWPk/copy",
    googleDriveUrl: "https://docs.google.com/spreadsheets/d/14ZB8w1j8CO3DICRXXakxNE8mKbL_agEn0qWPJ7blWPk/copy",
    featured: false,
    badge: "Marshall's System",
    pages: "Multiple sheets",
    highlights: [
      "Companion to the PM Systems presentation deck",
      "Ready-to-use tracking tools and worksheets",
      "Pair with the PDF for the complete PM system",
    ],
  },
  {
    id: "9",
    title: "Construction Checklists — Pre-Job, Daily & QC",
    description: "5 ready-to-use checklists covering pre-job safety, daily site management, quality control, subcontractor onboarding, and project closeout.",
    longDescription: "Five battle-tested checklists built for contractors who run tight, professional jobsites. Covers Pre-Job Safety (site assessment, permits, PPE, crew briefing), Daily Site Management (morning setup, safety review, end-of-day closeout), Quality Control Inspection (pre-pour, framing, rough-in, finishes, final walkthrough), Subcontractor Onboarding, and Project Closeout. Print them, laminate them, put them in your truck.",
    category: "operations",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/14i1hWbgHjJGhQJkFidc9xSqz00FPBk3tYm6NGKm3SIo/copy",
    googleDriveUrl: "https://docs.google.com/document/d/14i1hWbgHjJGhQJkFidc9xSqz00FPBk3tYm6NGKm3SIo/copy",
    featured: true,
    badge: "New",
    pages: "5 checklists",
    highlights: [
      "Pre-Job Safety Checklist — site assessment, permits, PPE, crew briefing",
      "Daily Site Checklist — morning setup, coordination, end-of-day closeout",
      "Quality Control Inspection — pre-pour through final walkthrough",
      "Subcontractor Onboarding Checklist — docs, scope, site rules",
      "Project Closeout Checklist — inspections, punch list, financial closeout",
    ],
  },
  {
    id: "10",
    title: "Subcontractor & Vendor Management SOPs",
    description: "6 SOPs for qualifying subs, managing bids, executing contracts, processing payments, and holding subs accountable.",
    longDescription: "Six comprehensive SOPs that turn subcontractor management from a headache into a system. Covers Subcontractor Qualification & Vetting, Bid & Scope Review (bid leveling, scope gap elimination), Subcontract Execution (required contract elements, process), Payment Management (lien waivers, retainage), Vendor & Material Procurement (POs, receiving), and Subcontractor Performance Management (accountability, termination for cause).",
    category: "operations",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1mMquQmg0mxKyrgma8CnLOFehrhAngsiEKv0KEFd6hBk/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1mMquQmg0mxKyrgma8CnLOFehrhAngsiEKv0KEFd6hBk/copy",
    featured: true,
    badge: "New",
    pages: "6 SOPs",
    highlights: [
      "Subcontractor Qualification & Vetting — license, insurance, references",
      "Bid Leveling & Scope Gap Elimination — apples-to-apples comparison",
      "Subcontract Execution — required elements, no mobilization without signed contract",
      "Payment Management — lien waiver process, retainage protocol",
      "Performance Management — accountability, deficiency notices, termination for cause",
    ],
  },
  {
    id: "11",
    title: "Client Communication & Sales Follow-Up SOPs",
    description: "6 SOPs for lead response, site visits, proposal presentation, follow-up sequences, objection handling, and client communication during construction.",
    longDescription: "Six SOPs that turn your sales process into a repeatable system. Covers Lead Response & Initial Contact (2-hour response standard, qualification questions), Site Visit & Needs Assessment (what to do, what never to do), Proposal Presentation & Delivery (three-tier pricing strategy, live presentation structure), Follow-Up Sequence (4-touch sequence with exact scripts), Objection Handling (four-step framework with scripts for price, more bids, think about it), and Client Communication During Construction (weekly updates, change orders, problem communication).",
    category: "sales",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1HBVZ3oyuLoRQfOJeDSPtTiPjsAN-_mpndM80G4tLmL0/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1HBVZ3oyuLoRQfOJeDSPtTiPjsAN-_mpndM80G4tLmL0/copy",
    featured: true,
    badge: "New",
    pages: "6 SOPs",
    highlights: [
      "Lead Response SOP — 2-hour response standard with exact scripts",
      "Site Visit SOP — how to run a professional needs assessment",
      "Proposal Presentation — three-tier pricing strategy and live presentation structure",
      "Follow-Up Sequence — 4-touch sequence with exact scripts for each touchpoint",
      "Objection Handling — four-step framework for price, more bids, and think about it",
    ],
  },
  {
    id: "12",
    title: "Subcontractor Agreement",
    description: "Complete subcontractor agreement template covering scope, payment, insurance, lien waivers, and termination provisions.",
    longDescription: "A comprehensive subcontractor agreement built for contractors who need airtight paperwork before any sub touches a jobsite. Covers scope of work, contract price and payment schedule, insurance and indemnification requirements, lien waiver provisions, change order process, termination for cause, and dispute resolution. Built on the same framework Marshall used on $2.5B+ in construction.",
    category: "contracts",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1QhSBhvGoUpz-q6uXmauYItUPLgyaZVDTTu0ReJHtk1M/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1QhSBhvGoUpz-q6uXmauYItUPLgyaZVDTTu0ReJHtk1M/copy",
    featured: false,
    badge: "Legal",
    pages: "Full agreement",
    highlights: [
      "Complete scope of work with inclusions and exclusions",
      "Payment schedule with lien waiver requirements",
      "Insurance and indemnification provisions",
      "Change order authorization process",
      "Termination for cause and dispute resolution",
    ],
  },
  {
    id: "13",
    title: "Daily Job Log / Field Report",
    description: "Daily field report template for tracking crew, progress, weather, materials, and issues on every jobsite.",
    longDescription: "A professional daily job log and field report template that keeps every jobsite documented and every day on record. Tracks date, project, superintendent, weather conditions, crew count and hours, work completed by trade, materials received, equipment used, subcontractors on site, safety observations, issues and delays, and photos/attachments log. The documentation that protects you in disputes and keeps your PM system tight.",
    category: "operations",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1ZqB1XsJfTvIIrblJfPQ47pzT-kkNH8tSpcbQmvg1qZE/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1ZqB1XsJfTvIIrblJfPQ47pzT-kkNH8tSpcbQmvg1qZE/copy",
    featured: false,
    badge: "Field Ready",
    pages: "Daily form",
    highlights: [
      "Crew count, hours, and trade breakdown",
      "Work completed by phase and trade",
      "Materials received and equipment log",
      "Issues, delays, and safety observations",
      "Photo and attachment log for documentation",
    ],
  },
  {
    id: "14",
    title: "Change Order Template",
    description: "Professional change order form with scope description, cost breakdown, schedule impact, and client authorization.",
    longDescription: "The change order template that gets signed and gets paid. Covers project info, change order number and date, detailed description of scope change, reason for change (owner request, unforeseen conditions, design change), cost breakdown (labor, materials, subcontractors, overhead and profit), schedule impact in days, revised contract total, and client authorization signature. Never do extra work without a signed change order.",
    category: "contracts",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1GGVY7EsAZ3bk68XxUFdHXaLnKKaowgoMzbPTx2VbqSs/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1GGVY7EsAZ3bk68XxUFdHXaLnKKaowgoMzbPTx2VbqSs/copy",
    featured: false,
    badge: "Get Paid",
    pages: "Single form",
    highlights: [
      "Scope description with reason for change",
      "Full cost breakdown: labor, materials, subs, O&P",
      "Schedule impact in calendar days",
      "Revised contract total calculation",
      "Client authorization signature block",
    ],
  },
  {
    id: "15",
    title: "Client Onboarding Checklist",
    description: "Complete client onboarding checklist covering contract execution, pre-construction meeting, site prep, and kickoff.",
    longDescription: "The client onboarding checklist that sets the tone for the entire project. Covers contract execution and deposit collection, pre-construction meeting agenda (project overview, schedule, communication protocol, change order process), site preparation requirements, permit status and posting, material selection deadlines, key contacts and escalation path, and project kickoff confirmation. First impressions become lasting impressions — this checklist makes sure yours is professional.",
    category: "operations",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1bVZFRRw8D0zqWQfdiVugV8p9L4-7sVAIsYu7sww3EDc/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1bVZFRRw8D0zqWQfdiVugV8p9L4-7sVAIsYu7sww3EDc/copy",
    featured: false,
    badge: "Client Ready",
    pages: "Full checklist",
    highlights: [
      "Contract execution and deposit collection steps",
      "Pre-construction meeting agenda template",
      "Site preparation and permit requirements",
      "Communication protocol and escalation path",
      "Project kickoff confirmation checklist",
    ],
  },
  {
    id: "16",
    title: "Construction Punch List",
    description: "Spreadsheet-based punch list for tracking all outstanding items by trade, location, priority, and completion status.",
    longDescription: "A professional punch list spreadsheet that tracks every outstanding item from rough-in through final walkthrough. Organized by trade and location, with columns for item description, responsible party, priority level (critical / standard / cosmetic), due date, and completion status. Includes a summary tab with completion percentage by trade. The tool that gets your final payment released on time.",
    category: "operations",
    fileType: "xlsx",
    downloadUrl: "https://docs.google.com/spreadsheets/d/1_jwNpKsmTqHuNAN8HMwKhPBIAW3mOmK5IkZYh2rUXYw/copy",
    googleDriveUrl: "https://docs.google.com/spreadsheets/d/1_jwNpKsmTqHuNAN8HMwKhPBIAW3mOmK5IkZYh2rUXYw/copy",
    featured: false,
    badge: "Final Payment",
    pages: "Multi-tab spreadsheet",
    highlights: [
      "Organized by trade and location",
      "Priority levels: critical, standard, cosmetic",
      "Responsible party and due date tracking",
      "Completion status with summary tab",
      "Completion percentage by trade",
    ],
  },
  {
    id: "17",
    title: "Construction Invoice",
    description: "Professional construction invoice template with line-item billing, retainage tracking, and payment terms.",
    longDescription: "A clean, professional construction invoice spreadsheet that handles line-item billing, retainage tracking, and running payment totals. Covers project info, invoice number and date, billing period, line items by phase or trade, retainage percentage and amount held, previous payments applied, current amount due, and payment terms. Looks professional, gets paid faster.",
    category: "finance",
    fileType: "xlsx",
    downloadUrl: "https://docs.google.com/spreadsheets/d/1yWC3qJq0ew1Sw5P3zTigm0l-fcPqldAI_sIouHNEF0o/copy",
    googleDriveUrl: "https://docs.google.com/spreadsheets/d/1yWC3qJq0ew1Sw5P3zTigm0l-fcPqldAI_sIouHNEF0o/copy",
    featured: false,
    badge: "Get Paid",
    pages: "Invoice sheet",
    highlights: [
      "Line-item billing by phase or trade",
      "Retainage percentage and running total",
      "Previous payments applied automatically",
      "Current amount due calculation",
      "Professional layout with payment terms",
    ],
  },
  {
    id: "18",
    title: "Roles & Responsibilities Framework",
    description: "The organizational framework that defines who owns what — from field to office. Eliminate confusion, overlap, and dropped balls.",
    longDescription: "The Roles & Responsibilities Framework that Marshall used to scale past $30M. Defines clear ownership for every function in a construction company — from the field (Superintendent, Foreman, Lead Carpenter) to the office (Project Manager, Estimator, Office Manager, Owner). Each role includes: primary responsibilities, decision-making authority, who they report to, and key performance indicators. The document that ends 'I thought you were handling that.'",
    category: "operations",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1H5_dKbrSgwTpKD7lxK4i3dsjMJvnhCs2sg3l3f4AZHk/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1H5_dKbrSgwTpKD7lxK4i3dsjMJvnhCs2sg3l3f4AZHk/copy",
    featured: true,
    badge: "Scale",
    pages: "Full framework",
    highlights: [
      "Field roles: Superintendent, Foreman, Lead Carpenter",
      "Office roles: PM, Estimator, Office Manager, Owner",
      "Decision-making authority for each role",
      "Reporting structure and KPIs per role",
      "The framework that eliminates 'I thought you were handling that'",
    ],
  },
  {
    id: "8",
    title: "Construction SOPs Template",
    description: "12 comprehensive standard operating procedures for construction project management.",
    longDescription: "A complete set of 12 battle-tested Standard Operating Procedures covering every phase of construction project management. Includes Daily Pre-Task Planning (Toolbox Talk), Material Receiving & Inspection, Equipment Daily Inspection, Subcontractor Coordination, Daily Progress Reporting, Change Order Management, RFI Processing, Safety Incident Reporting, Quality Control Inspection, Punch List Management, Project Closeout, and Document Control & Filing.",
    category: "operations",
    fileType: "docx",
    downloadUrl: "https://docs.google.com/document/d/1jjzpZba5u1sQUQ1lEJR3sYsn8jspKrt3z0xDpq8xXD0/copy",
    googleDriveUrl: "https://docs.google.com/document/d/1jjzpZba5u1sQUQ1lEJR3sYsn8jspKrt3z0xDpq8xXD0/copy",
    featured: true,
    badge: "New",
    pages: "12 SOPs",
    highlights: [
      "Daily Pre-Task Planning (Toolbox Talk) with safety checklist",
      "Material Receiving & Inspection protocol",
      "Subcontractor Coordination and daily progress reporting",
      "Change Order Management and RFI Processing workflows",
      "Safety Incident Reporting, QC Inspection, and Project Closeout",
    ],
  },
];

const CATEGORIES: { value: TemplateCategory; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: FolderOpen },
  { value: "proposals", label: "Proposals", icon: FileText },
  { value: "contracts", label: "Contracts", icon: Shield },
  { value: "sales", label: "Sales", icon: Target },
  { value: "operations", label: "Operations", icon: BarChart3 },
  { value: "finance", label: "Finance", icon: FileSpreadsheet },
];

const FILE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ElementType; accent: string }> = {
  pdf:  { color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/20",   label: "PDF",  icon: BookOpen,       accent: "#F87171" },
  docx: { color: "text-blue-400",  bg: "bg-blue-500/10",  border: "border-blue-500/20",  label: "DOCX", icon: FileText,       accent: "#60A5FA" },
  xlsx: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", label: "XLSX", icon: FileSpreadsheet, accent: "#4ADE80" },
};

// Fetch the file as a blob and trigger a real browser download — works for cross-origin CDN files
async function triggerDownload(url: string, filename: string, onProgress?: (pct: number) => void) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total && onProgress) onProgress(Math.round((loaded / total) * 100));
  }

  const blob = new Blob(chunks as any[]);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function TemplateModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const ft = FILE_CONFIG[template.fileType];
  const Icon = ft.icon;

  async function handleDownload() {
    if (downloading || done) return;
    setDownloading(true);
    setProgress(0);
    try {
      await triggerDownload(
        template.downloadUrl,
        `${template.title}.${template.fileType}`,
        (pct) => setProgress(pct),
      );
      setDone(true);
    } catch (err) {
      console.error(err);
      // Fallback: open in new tab
      window.open(template.downloadUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header graphic */}
        <div
          className="relative flex flex-col items-center justify-center px-5 sm:px-8 pt-8 sm:pt-10 pb-6 sm:pb-8"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${ft.accent}18 0%, transparent 70%)` }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-cream-muted" />
          </button>

          {/* File type icon — large */}
          <div
            className={`w-20 h-20 rounded-2xl ${ft.bg} ${ft.border} border-2 flex items-center justify-center mb-4 shadow-lg`}
            style={{ boxShadow: `0 0 32px ${ft.accent}30` }}
          >
            <Icon className={`w-10 h-10 ${ft.color}`} />
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ft.bg} ${ft.color}`}>
              {ft.label}
            </span>
            {template.badge && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ember/15 text-ember">
                {template.badge}
              </span>
            )}
            {template.pages && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-white/5 text-cream-muted">
                {template.pages}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="font-heading text-xl font-bold text-cream text-center leading-tight">
            {template.title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-8 pb-6 sm:pb-8 space-y-5">
          {/* Description */}
          <p className="text-cream-muted text-sm leading-relaxed text-center">
            {template.longDescription}
          </p>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* What's inside */}
          <div>
            <p className="text-[10px] font-bold text-ember uppercase tracking-widest mb-3">What's Inside</p>
            <div className="space-y-2">
              {template.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-ember shrink-0 mt-0.5" />
                  <span className="text-cream-muted text-sm leading-snug">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action button — unified "Access Document" for all templates */}
          <a
            href={template.googleDriveUrl || template.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all bg-ember/15 hover:bg-ember/25 border border-ember/30 text-ember"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>Access Document</span>
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// ─── Template Request Form ───────────────────────────────────────────────────
function TemplateRequestForm() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitRequest = trpc.circle.submitTemplateRequest.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTitle("");
      setDescription("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !title.trim() || !description.trim()) return;
    submitRequest.mutate({ memberName: name, memberEmail: email, templateTitle: title, description });
  }

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 md:p-8 border border-ember/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-ember/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-ember" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-cream">Request a Template or SOP</h2>
          <p className="text-cream-muted text-xs mt-0.5">Tell us what you need — we build the library around you.</p>
        </div>
      </div>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-8 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <p className="font-heading text-sm font-semibold text-cream">Request Submitted</p>
          <p className="text-cream-muted text-xs max-w-xs">
            Marshall reviews every request personally. If it's a fit for the library, it gets built.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-2 text-xs text-ember hover:underline"
          >
            Submit another request
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-cream-muted uppercase tracking-wider">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="First Last"
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-cream placeholder:text-cream-muted/40 focus:outline-none focus:border-ember/40 focus:ring-1 focus:ring-ember/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-cream-muted uppercase tracking-wider">Your Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-cream placeholder:text-cream-muted/40 focus:outline-none focus:border-ember/40 focus:ring-1 focus:ring-ember/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-cream-muted uppercase tracking-wider">Template or SOP Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Pre-Construction Meeting Agenda, Lien Waiver Template..."
              required
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-cream placeholder:text-cream-muted/40 focus:outline-none focus:border-ember/40 focus:ring-1 focus:ring-ember/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-cream-muted uppercase tracking-wider">What do you need and why?</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the template or SOP you need and how you'd use it on the job..."
              required
              rows={4}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-cream placeholder:text-cream-muted/40 focus:outline-none focus:border-ember/40 focus:ring-1 focus:ring-ember/20 transition-all resize-none"
            />
          </div>

          {submitRequest.error && (
            <p className="text-red-400 text-xs">{submitRequest.error.message}</p>
          )}

          <button
            type="submit"
            disabled={submitRequest.isPending || !name.trim() || !email.trim() || !title.trim() || !description.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-ember text-white text-sm font-semibold rounded-lg hover:bg-ember/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitRequest.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-4 h-4" /> Submit Request</>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function PortalTemplates() {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const { isSubscribed } = useMember();

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter(t => {
      if (activeCategory !== "all" && t.category !== activeCategory) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !t.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [activeCategory, searchQuery]);

  const featuredTemplates = TEMPLATES.filter(t => t.featured);

  return (
    <SubscriptionGate isSubscribed={isSubscribed}>
    <>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-cream">
            Template Library
          </h1>
          <p className="text-cream-muted mt-1">
            Battle-tested templates built on the ALP framework. Click any template to preview and download.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Templates", value: TEMPLATES.length.toString() },
            { label: "Immediately Usable", value: "100%" },
            { label: "ALP Framework", value: "Built In" },
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-xl p-3 md:p-4 text-center">
              <div className="font-heading text-lg md:text-2xl font-bold text-ember">{stat.value}</div>
              <div className="text-cream-muted text-[10px] md:text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Featured Templates */}
        {featuredTemplates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-ember" />
              <h2 className="font-heading text-sm font-semibold text-ember uppercase tracking-wider">Featured Templates</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {featuredTemplates.map((template, i) => {
                const ft = FILE_CONFIG[template.fileType];
                const Icon = ft.icon;
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="group glass-card rounded-xl p-3 sm:p-5 flex flex-col hover:bg-white/[0.04] transition-all duration-300 border border-ember/10 cursor-pointer"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${ft.bg} ${ft.color}`}>
                        {ft.label}
                      </span>
                      {template.badge && (
                        <span className="text-[9px] font-semibold text-ember bg-ember/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {template.badge}
                        </span>
                      )}
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${ft.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${ft.color}`} />
                    </div>
                    <h3 className="font-heading text-sm font-semibold text-cream group-hover:text-ember transition-colors line-clamp-2 flex-1">
                      {template.title}
                    </h3>
                    <p className="text-cream-muted text-xs mt-2 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-ember text-xs font-semibold">
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Preview & Download</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-muted" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-cream placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/30 focus:ring-1 focus:ring-ember/20 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6 sm:mx-0 sm:px-0">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = cat.value === "all" ? TEMPLATES.length : TEMPLATES.filter(t => t.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    activeCategory === cat.value
                      ? "bg-ember/15 text-ember border border-ember/20"
                      : "bg-white/5 text-cream-muted hover:text-cream border border-transparent"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat.value ? "bg-ember/20 text-ember" : "bg-white/10 text-cream-muted"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Template List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card rounded-xl p-12 text-center"
              >
                <FolderOpen className="w-8 h-8 text-cream-muted mx-auto mb-3" />
                <p className="text-cream-muted text-sm">No templates match your search.</p>
              </motion.div>
            ) : (
              filteredTemplates.map((template, i) => {
                const ft = FILE_CONFIG[template.fileType];
                const Icon = ft.icon;
                return (
                  <motion.div
                    key={template.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04 }}
                    className="group glass-card rounded-xl overflow-hidden hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg ${ft.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${ft.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium uppercase tracking-wider ${ft.bg} ${ft.color}`}>
                            {ft.label}
                          </span>
                          <span className="text-cream-muted text-[9px] sm:text-[10px] uppercase tracking-wider hidden sm:inline">
                            {template.category}
                          </span>
                          {template.badge && (
                            <span className="text-[9px] font-semibold text-ember bg-ember/10 px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {template.badge}
                            </span>
                          )}
                        </div>
                        <h3 className="font-heading text-xs sm:text-sm font-semibold text-cream group-hover:text-ember transition-colors leading-tight">
                          {template.title}
                        </h3>
                        <p className="text-cream-muted text-xs mt-1 line-clamp-1 hidden sm:block">
                          {template.description}
                        </p>
                      </div>
                      <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-ember/10 group-hover:bg-ember/20 flex items-center justify-center transition-all">
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ember" />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Template Request Section */}
        <TemplateRequestForm />
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplateModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
          />
        )}
      </AnimatePresence>
    </>
    </SubscriptionGate>
  );
}
