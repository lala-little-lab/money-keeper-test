# Money Keeper — Step2 IndexedDB test draft

This is a **local test build**, not production-ready. Do not enter real personal financial data.

- IndexedDB snapshot restore at startup; saves most state changes after render.
- Some rare actions may not be covered yet; verify all mutation paths before production.
- No JSON export/import backup, multi-device sync, or full migrations yet.
- Data is stored in the browser on the current device, not in GitHub.
- Use only fictional amounts and verify refresh persistence in Galaxy Chrome.
- Do not publish this draft over the production site before full regression tests.
- Never commit personal finance records or backups to public GitHub.
