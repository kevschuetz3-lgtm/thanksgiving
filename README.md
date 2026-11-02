# Family Thanksgiving 2026 sign-up list

Live page: https://kevschuetz3-lgtm.github.io/thanksgiving/ (dinner for 16 on Thursday, November 26, 2026).

Anyone with the link can sign up for a dish, or add one that isn't on the list. No account is needed.

## How it works

- `index.html` is the whole page. GitHub Pages serves it from `main`, so a push goes live in about a minute.
- Names are saved by a small Google Apps Script (`apps-script/Code.js`). It runs as kevschuetz3@gmail.com and writes to the Google Sheet it's attached to: **Family Thanksgiving 2026 — sign-ups**, https://docs.google.com/spreadsheets/d/1CPkEsbM8A_tA1b42_48Q5CDQANnKON9YExYFdCOVcR8/edit, tab "Sign-ups".
- Each browser gets its own private key. The sheet's hidden `key` column stores a hash of it, so only the phone or computer that signed up for a dish can change or remove that sign-up from the page. Other people's names show without a change button.

## Fixing the list by hand

Edit the Sheet directly. The page picks up changes the next time someone opens it, and open pages refresh every minute.

- **Change or clear a name:** edit the "Bringing it" cell, or clear it to reopen the dish.
- **Add a dish:** type the Course and Dish in a new row. The script fills in an id the next time the page loads.
- **Remove a dish:** delete its row.

Columns E–F (`id`, `key`) are hidden on purpose. Leave them alone, except to clear `key` when you want nobody to be able to change a sign-up from the page.

## Changing the script

From `apps-script/`, with clasp signed in as kevschuetz3@gmail.com:

```
clasp push
clasp create-version "what changed"
clasp update-deployment AKfycbw4zMzMtbsXacyYhIvrp5QkCYNobWnFLOwniofmm8h4NGPdxZjP_vbg88yyUe-SIat0nA -V <new version>
```

Updating that deployment keeps the web app URL the page calls. Running `clasp create-deployment` instead would make a new URL.
