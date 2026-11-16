# papier-restaurierung.at

Static copy of the former Wix site www.papier-restaurierung.at, hosted on GitHub Pages from `docs/`.

## Layout

- `docs/` – the published site (generated, do not edit by hand). Wix serves three layouts from the same URLs,
  chosen by device; the copy keeps them as `docs/` (desktop), `docs/t/` (tablets: desktop layout at 980px) and
  `docs/m/` (phones). A small script at the top of each page switches to the right one.
- `src/site.js` – the site's behaviour (menu scrolling and highlighting, "Mehr erfahren", mobile menu, back-to-top
  button, entrance animations, chat frame sizing). Timings were measured on the live Wix site.
- `src/chat.js` – the chat widget (Wix's markup incl. emoji picker; send button, attachments). Messages and
  attached files are e-mailed via FormSubmit (free): a classic form post into a hidden frame, which FormSubmit
  redirects to `chat-sent.html` to confirm delivery. The form alias in this file is public by design.
- `tools/` – capture, build and verification scripts.

## Rebuilding (only needed while the Wix original still exists)

```sh
node tools/capture.js ~/data/papier-restaurierung/ref        # live DOM + reference screenshots + browser assets
node tools/probe-states.js ~/data/papier-restaurierung/states # DOM states; tools/probe-chat.js for the chat frame
uv run --with beautifulsoup4 --with requests --with fonttools --with brotli \
  tools/build.py ~/data/papier-restaurierung/ref ~/data/papier-restaurierung/states
python3 tools/serve.py docs 18741                              # local preview, resolves /impressum like Pages
node tools/capture.js /tmp/copy http://127.0.0.1:18741/ http://127.0.0.1:18741/m/ && node tools/diff.js <ref> /tmp/copy <diffdir>
```

Playwright, pngjs and pixelmatch must be resolvable (`NODE_PATH`).

## Fonts

Visible text uses Lato and Raleway (SIL OFL). Wix also loads commercial fonts licensed only for Wix-hosted sites;
they are not published here:
- Futura LT (mobile menu, "Mehr erfahren"): replaced by Jost (OFL), scaled to Futura's widths and line metrics.
- Didot / DIN (no visible text): replaced by Lato with the original line metrics, so line heights stay put.
- Helvetica Neue Light (chat subtitle): the visitor's system copy (Apple devices), else Arial/Roboto.

## Editing content later

The pages are Wix-generated HTML; small text edits can be made directly in `docs/*.html`, `docs/t/*.html` and
`docs/m/*.html` (all three layouts). Rebuilding from Wix stops working once the Wix site is gone.
