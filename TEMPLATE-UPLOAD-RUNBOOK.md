# ALP Contractor Portal — Template Upload Runbook

This document is the definitive guide for adding new templates to the ALP Contractor Circle Template Library. Follow every step exactly to avoid broken downloads, 404 errors, or missing files.

---

## Pre-Upload Checklist

Before uploading anything, verify the following:

| Check | Requirement |
|-------|-------------|
| **Filename** | ASCII characters only — no em dashes (`—`), curly quotes, accented characters, or special Unicode. Use underscores (`_`) instead of spaces. |
| **File format** | Must be `.pdf`, `.xlsx`, `.docx`, or `.csv`. |
| **File location** | The source file must exist on the sandbox filesystem (e.g., `/home/ubuntu/upload/`). |
| **Static assets directory** | Ensure `/home/ubuntu/webdev-static-assets/` exists. Create it with `mkdir -p /home/ubuntu/webdev-static-assets/` if needed. |

---

## Step 1: Clean the Filename

**This is the most critical step.** The `/manus-storage/` CDN path breaks on non-ASCII characters. The em dash (`—`, Unicode U+2014) is the most common offender.

**Bad filenames (will cause 400/404 errors):**
- `ALP_Contractor_Circle_—_Monthly_Boot_Camp.pdf` (em dash)
- `Marshall's_Template.pdf` (curly apostrophe)
- `Résumé_Template.pdf` (accented character)

**Good filenames:**
- `ALP_Contractor_Circle_Monthly_Boot_Camp.pdf`
- `Marshalls_Template.pdf`
- `Resume_Template.pdf`

Copy the file with a clean name:

```bash
cp "/home/ubuntu/upload/Original_File_Name.pdf" /home/ubuntu/webdev-static-assets/Clean_File_Name.pdf
```

---

## Step 2: Upload to CDN

Use the `manus-upload-file --webdev` command. This uploads to the project-scoped S3 storage and returns a `/manus-storage/` path.

```bash
manus-upload-file --webdev /home/ubuntu/webdev-static-assets/Clean_File_Name.pdf
```

**Expected output:**

```
Uploading file (webdev private): /home/ubuntu/webdev-static-assets/Clean_File_Name.pdf (size: XXXXX bytes)
File uploaded successfully!
Storage Path: /manus-storage/Clean_File_Name_abc12345.pdf
```

**Save the `Storage Path` value.** This is the `downloadUrl` you will use in the template entry.

---

## Step 3: Verify the Upload Works

Test the URL before adding it to the code. Replace `alpcontractorcircle.com` with the production domain:

```bash
curl -sI "https://alpcontractorcircle.com/manus-storage/Clean_File_Name_abc12345.pdf" | head -3
```

**Expected result — HTTP 307 redirect to CloudFront:**

```
HTTP/2 307
date: ...
location: https://d36hbw14aib5lz.cloudfront.net/...
```

**If you see HTTP 400 or 404, the filename has bad characters. Go back to Step 1.**

---

## Step 4: Add the Template Entry to PortalTemplates.tsx

Open `client/src/pages/PortalTemplates.tsx` and add a new entry to the `TEMPLATES` array. Follow this exact structure:

```typescript
{
  id: "34",  // Increment from the last template ID
  title: "Template Title — Short Description",
  description: "One-sentence summary of what this template is.",
  longDescription: "Detailed multi-paragraph description...",
  category: "operations",  // Must be a valid TemplateCategory
  fileType: "pdf",
  downloadUrl: "/manus-storage/Clean_File_Name_abc12345.pdf",  // From Step 2
  featured: true,  // or false
  badge: "New",  // Optional: "New", "Bootcamp", "Popular", etc.
  pages: "X pages",
  highlights: [
    "Key point 1",
    "Key point 2",
    "Key point 3",
  ],
},
```

**Valid categories** (defined in the `TemplateCategory` type):

| Category | Label |
|----------|-------|
| `sales` | Sales & Proposals |
| `operations` | Operations |
| `financial` | Financial |
| `marketing` | Marketing |
| `hr` | HR & People |
| `legal` | Legal & Compliance |
| `contractor_circle` | Contractor Circle |
| `leadership` | Leadership |

If you need a new category, you must add it to both the `TemplateCategory` type union and the `CATEGORIES` array in the same file.

---

## Step 5: Update the Test File

Open `server/templates.test.ts` and:

1. **Update the total count** in the "has correct number of templates" test.
2. **Add the new template ID** to the "has all expected template IDs" test.
3. **If you added a new category**, add it to the "has valid categories" test.

---

## Step 6: Run Tests

```bash
cd /home/ubuntu/alp-contractor-portal && npx vitest run
```

All tests must pass before saving a checkpoint.

---

## Step 7: Save Checkpoint and Deploy

```
webdev_save_checkpoint → webdev_deploy_project
```

---

## Common Mistakes and How to Avoid Them

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Em dash (`—`) in filename | HTTP 400 on download | Re-upload with clean ASCII filename |
| Special Unicode characters in filename | HTTP 400 or 404 | Re-upload with clean ASCII filename |
| Forgot `--webdev` flag on upload | File not accessible via `/manus-storage/` | Re-upload with `--webdev` flag |
| Used full CDN URL instead of `/manus-storage/` path | Works now but may break later | Use the `/manus-storage/` path returned by the upload command |
| Didn't verify URL before adding to code | Members get 404 on download | Always run the `curl -sI` check in Step 3 |
| Didn't update test file | Tests fail | Always update `templates.test.ts` |
| Added category not in `TemplateCategory` type | TypeScript error | Add to both the type and `CATEGORIES` array |

---

## Quick Reference: Full Upload Command Sequence

```bash
# 1. Clean filename and copy
mkdir -p /home/ubuntu/webdev-static-assets
cp "/home/ubuntu/upload/Original_Name.pdf" /home/ubuntu/webdev-static-assets/Clean_Name.pdf

# 2. Upload
manus-upload-file --webdev /home/ubuntu/webdev-static-assets/Clean_Name.pdf

# 3. Verify (replace with actual path from step 2)
curl -sI "https://alpcontractorcircle.com/manus-storage/Clean_Name_abc12345.pdf" | head -3

# 4. Edit PortalTemplates.tsx — add entry with downloadUrl from step 2
# 5. Edit templates.test.ts — update count and IDs
# 6. Run tests
cd /home/ubuntu/alp-contractor-portal && npx vitest run

# 7. Save checkpoint and deploy
```
