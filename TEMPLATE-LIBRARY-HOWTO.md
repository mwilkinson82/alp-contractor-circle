# How to Add a Template to the Portal Library

## WHERE TEMPLATES LIVE

Templates are **hardcoded** in `client/src/pages/PortalTemplates.tsx` in the `TEMPLATES` array (starts around line 48).

They are **NOT** in MySQL. They are **NOT** in Supabase. Do NOT waste time querying databases.

## STEPS TO ADD A NEW TEMPLATE

1. **Upload the document to Google Drive** as a Google Doc:
   ```bash
   gws drive files create --upload /path/to/file.docx --name "Template Name" --mime-type application/vnd.google-apps.document
   ```

2. **Set sharing to "anyone with link can view"**:
   ```bash
   gws drive permissions create --file-id <FILE_ID> --type anyone --role reader
   ```

3. **Build the force-copy URL**:
   ```
   https://docs.google.com/document/d/<FILE_ID>/copy
   ```

4. **Add the template entry to `client/src/pages/PortalTemplates.tsx`** in the `TEMPLATES` array:
   ```typescript
   {
     id: "<next_number>",
     title: "Template Name",
     description: "Short one-liner",
     longDescription: "Detailed description for the modal",
     category: "estimating",  // one of: proposals, contracts, sales, operations, finance, estimating
     fileType: "docx",        // one of: pdf, docx, xlsx
     downloadUrl: "https://docs.google.com/document/d/<FILE_ID>/copy",
     googleDriveUrl: "https://docs.google.com/document/d/<FILE_ID>/copy",
     featured: true,
     badge: "New",
     pages: "X pages",
     highlights: [
       "Highlight 1",
       "Highlight 2",
     ],
   },
   ```

5. **Deploy** — the template count updates automatically via `TEMPLATES.length`.

6. **Send announcement email** to all active CC members using the branded email pattern in `server/email.ts` (see `buildEosScorecardAnnouncementHtml` for reference).

## CATEGORIES
- proposals
- contracts
- sales
- operations
- finance
- estimating

## CURRENT TEMPLATE COUNT
24 templates (as of April 6, 2026)
