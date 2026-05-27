# Privacy Policy — Sceless Browser Extension

_Last updated: 2026-05-27_

Sceless ("the Extension") is a browser extension for Google Chrome that provides a redesigned interface for [scele.cs.ui.ac.id](https://scele.cs.ui.ac.id).

---

## What We Collect and Store

All data is stored **locally on your device only** — nothing is sent to any server operated by the developer.

| Data | Purpose | Where |
|---|---|---|
| Moodle Web Service token | Authenticate API calls to SCELE | `chrome.storage.local` |
| UI theme preference | Persist your chosen color theme | `chrome.storage.local` |
| Pinned courses | Remember courses you have pinned | `chrome.storage.local` |
| Course, deadline, and announcement data | Cache to reduce API calls to SCELE | Browser IndexedDB |

## What We Do NOT Collect

- **Passwords** — your SCELE password is used once to obtain a token and is never stored.
- **Browsing history** outside of `scele.cs.ui.ac.id`
- **Personal information** beyond what SCELE's own API returns to the authenticated user
- **Analytics, telemetry, or crash reports** of any kind

## Data Transmission

The Extension communicates exclusively with `scele.cs.ui.ac.id` — the same server your browser would contact when using SCELE normally. No data is sent to any third-party server.

## Data Deletion

You can delete all data stored by the Extension at any time:

1. Open the Extension on any SCELE page
2. Click your profile picture (top right) → **Clear Data**

Uninstalling the Extension also removes all locally stored data.

## Disclaimer

Sceless is an independent project and is **not affiliated with, endorsed by, or officially connected** to Universitas Indonesia or the SCELE platform.

The Extension is provided **"as is"**, without warranty of any kind. The developer is not responsible for any data loss, account issues, or damages resulting from the use of this Extension. Use at your own risk.

## Contact

For questions or concerns, open an issue at the project's GitHub repository.
