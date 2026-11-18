# Feedback → Google Spreadsheet

The in-app feedback form (Settings → **Feedback**) posts to a Google Apps
Script web app, which appends a row to a spreadsheet you own. No backend,
no third-party service, no API key in the bundle.

You have to do this part yourself — it needs your Google account.

---

## 1. Create the sheet

1. Go to <https://sheets.new> and give it a name, e.g. `Nexinote feedback`.
2. Leave it empty. The script writes a bold, frozen header row on the
   first submission.

## 2. Add the script

1. In that spreadsheet: **Extensions → Apps Script**.
2. Delete the placeholder `myFunction`, then paste in all of
   [`Code.gs`](./Code.gs) from this folder.
3. Save (the project name doesn't matter).

## 3. Deploy it as a web app

1. **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. **Deploy**, then authorise when prompted. Google will warn that the
   app isn't verified — that's expected for your own script. Choose
   **Advanced → Go to (project name)**.
5. Copy the **Web app URL**. It ends in `/exec`.

> **"Anyone" is required.** Your testers' browsers post to this URL
> without signing in to Google. The URL is the only thing guarding it, so
> treat it as semi-secret: anyone who has it can append rows. Since it
> ships inside a public JS bundle, assume it *is* public and see
> "If it gets abused" below.

Paste the URL into a browser to check it — you should see
`{"ok":true,"service":"nexinote-feedback"}`.

## 4. Point the app at it

Create a `.env` file in the repo root (it's gitignored):

```
VITE_FEEDBACK_ENDPOINT=https://script.google.com/macros/s/AKfy…/exec
```

Then rebuild — `VITE_*` values are inlined at build time, so a running
dev server needs a restart and a deployed copy needs a fresh `npm run build`.

Without it the form still opens and still lets people **Copy** their
message; only the Send button is disabled, with an explanation.

---

## What lands in the sheet

One row per submission, in this column order:

| Column | Notes |
|---|---|
| `submittedAt` | ISO timestamp from the user's device |
| `category` | `bug` / `confusing` / `idea` / `praise` / `other` |
| `message` | What they wrote |
| `contact` | Email, only if they chose to give one |
| `version` | App version |
| `theme` | Active theme key |
| `boards`, `cards`, `connectors` | **Counts only** |
| `viewport`, `dpr` | Screen size — useful for layout bug reports |
| `platform`, `language` | User agent, locale |
| `installed` | Whether they were running the installed PWA |
| `receivedAt` | Server-side timestamp |

**No board content is ever transmitted** — no note text, card titles,
board names, sketch strokes, images or map pins. The client only reads
`.length` off those collections. This is stated to the user next to the
form, so if you extend `collectContext()` in
[`src/utils/feedback.ts`](../src/utils/feedback.ts), update the wording in
`FeedbackPanel.tsx` to match.

## Changing the columns

Append new fields to the **end** of `COLUMNS` in `Code.gs`. Inserting in
the middle shifts every historical row out of alignment with its header.

After editing the script you must **Deploy → Manage deployments → edit →
Deploy** again; saving alone does not update the live web app.

## If it gets abused

The endpoint is public by necessity. Options, roughly in order of effort:

- **Archive and re-deploy.** Delete the deployment, make a new one, ship a
  build with the new URL. Old URL dies instantly.
- **Add a shared token.** Put a random string in the payload and have
  `doPost` reject anything without it. Stops drive-by posts to a scraped
  URL, though the token is equally visible in the bundle.
- **Rate-limit per submission.** Apps Script can stash the last write time
  in `PropertiesService` and drop anything arriving too fast.
- **Turn it off.** Delete the deployment. The app degrades to copy-only
  with a clear message; nothing crashes.
