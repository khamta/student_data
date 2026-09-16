# ລະບົບຈັດການທຳນຽບນັກສຶກສາ (Student Registry Manager)

A free, self-hosted web app for managing the student graduation registry data
shown in your report template — add/edit/delete students, manage
majors/categories, upload photos, and generate a printable report grouped
by major with automatic male/female counts, matching the layout of your
existing spreadsheet.

It is built as a **Google Apps Script web app bound to a Google Sheet**.
That means:

- **100% free** — hosted by Google on `script.google.com`, no server,
  no credit card, no expiring trial.
- **Data lives in a normal Google Sheet** you own, so you can always open
  it directly, back it up, or export it.
- **No API keys / service accounts to manage** — the app runs under your
  own Google account permissions.

## Files

Only **two files** need to be pasted into Apps Script:

| File               | Purpose                                                        |
|--------------------|-----------------------------------------------------------------|
| `Code.gs`          | Server-side logic: sheet setup, CRUD, photo upload, report data |
| `Index.html`       | The entire app UI — HTML, CSS and JavaScript in one file         |

`appsscript.json` is included for reference / `clasp` deploys, but you do
**not** need to open or edit it — Apps Script figures out the permissions
it needs (Sheets + Drive) automatically the first time you run it.

Data is stored in 3 sheets, auto-created the first time the app runs:

- **Students** — one row per student (all fields from the form)
- **Categories** — the "I. ...", "II. ..." group / major headings
- **Settings** — the header text block and titles shown on the printed report

## Deploy it for free (3 minutes, no coding needed)

This last step has to be done from **your own Google account** — deploying
an Apps Script project requires clicking "Authorize" as yourself, which
nobody else (including an AI assistant) can do on your behalf. It's quick:

### Option A — Copy-paste into the Apps Script editor (simplest)

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new
   blank spreadsheet**. Name it e.g. `ທຳນຽບນັກສຶກສາ`.
2. In the sheet, open **Extensions → Apps Script**.
3. In the editor:
   - Open `Code.gs` (the default file), delete everything in it, and paste
     in the contents of this repo's [`Code.gs`](./Code.gs). Save (Ctrl/Cmd+S).
   - Click the `+` next to **Files** → **HTML** → name the new file exactly
     `Index` → delete its placeholder contents and paste in this repo's
     [`Index.html`](./Index.html). Save.
4. Click **Deploy → New deployment**.
   - Click the gear next to "Select type" → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (fully public link) or **Anyone with a
     Google account** if you want to require sign-in first.
   - Click **Deploy**, then **Authorize access** and approve the permission
     prompts (this is your own script asking to edit your own sheet/drive —
     safe to accept).
5. Copy the **Web app URL** shown — that is your live app. Open it, and
   the three data sheets (`Students`, `Categories`, `Settings`) will be
   created automatically the first time it loads.

That's it — the app is live, free, and yours. Bookmark the Web app URL, or
open the sheet and use **Extensions → ⁠ລະບົບຈັດການນັກສຶກສາ → ເປີດຄູ່ມືການນຳໃຊ້**
as a reminder of where to find it.

If you ever edit the code again later, you only need **Deploy → Manage
deployments → ✏️ (edit) → New version → Deploy** to push the update live at
the same URL.

### Option B — Deploy via `clasp` (if you prefer the command line)

```bash
npm install -g @google/clasp
clasp login
clasp create --title "Student Registry" --type sheet --rootDir .
clasp push
clasp deploy
```

`clasp create --type sheet` creates a brand-new bound Google Sheet for you
and links this folder to it. After `clasp deploy`, get the web app URL with
`clasp deployments` / from the Apps Script editor's **Deploy → Manage
deployments**.

## Using the app

- **ລາຍຊື່ນັກສຶກສາ (Student list)** — search/filter, add, edit, delete
  students. Photos are uploaded straight into a Google Drive folder called
  `StudentPhotos_DoNotDelete` and linked into the sheet automatically.
- **ໝວດໝູ່ / ສາຂາວິຊາ (Categories)** — add/rename/delete the "I. ...",
  "II. ..." major groupings used to organize the report.
- **ຕັ້ງຄ່າຫົວບົດລາຍງານ (Settings)** — edit the organization header lines,
  report title, and signature-line captions shown on the printed report.
- **ພິມ / ອອກລາຍງານ (Report)** — renders the full report grouped by
  category with per-category and grand-total male/female counts, matching
  your original layout. Click **🖨️ ພິມ / ບັນທຶກເປັນ PDF** and choose
  "Save as PDF" in the browser print dialog to export a PDF — no extra
  service required.

## Notes & customization

- Photos are shared as "anyone with the link can view" so they can be
  embedded in the report/app; don't upload sensitive images if that's a
  concern for your use case.
- The exact wording of the summary rows / titles can be adjusted any time
  from the **Settings** tab — no code changes needed.
- Because the app is bound to your Google Sheet, you (or anyone you share
  edit-access with) can also open the raw sheets directly for bulk edits,
  and the web app will reflect those changes on next reload.
- To restrict who can use the app, redeploy with **Who has access → Anyone
  with a Google account**, or **Only myself**, from **Deploy → Manage
  deployments → Edit (pencil icon)**.
