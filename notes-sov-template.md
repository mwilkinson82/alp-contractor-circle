# AIA G702/G703 SOV Template Analysis

## Structure
The SOV Excel has 2 worksheets:

### Sheet 1: G702 — Application & Certificate for Payment
- Header with TO OWNER, PROJECT, FROM CONTRACTOR, VIA ARCHITECT
- Application No, Period To, Contract Date, Project No
- 9-line calculation:
  1. Original Contract Sum
  2. Net Change by Change Orders
  3. Contract Sum to Date (1 +/- 2)
  4. Total Completed & Stored to Date (from G703 Col G)
  5. Retainage (a: % of completed work, b: % of stored material)
  6. Total Earned Less Retainage (4 - 5)
  7. Less Previous Certificates for Payment
  8. Current Payment Due (6 - 7)
  9. Balance to Finish Including Retainage (3 - 6)
- Contractor certification signature block
- Architect certification signature block

### Sheet 2: G703 — Continuation Sheet
Columns:
- A: Item No.
- B: Description of Work
- C: Scheduled Value
- D: Work Completed from Previous Application (D+E)
- E: Work Completed This Period
- F: Materials Presently Stored (Not in D or E)
- G: Total Completed and Stored to Date (D+E+F)
- H: % Complete (G / C)
- I: Balance to Finish (C - G)
- J: Retainage (if variable rate)

Line items are grouped by category (General Conditions, Switchgear/Wire/Equipment, Closeout)
Has CONTRACT TOTALS row at bottom summing all columns.

## Key Takeaway
This is a proper AIA G702/G703 format — we need to generate BOTH sheets in an Excel file.
The G703 continuation sheet is the SOV, the G702 is the payment application cover sheet.
Users need Excel format so they can fill in the "This Period" column for each draw.
