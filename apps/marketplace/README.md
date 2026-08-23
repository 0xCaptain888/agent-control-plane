# AgentGuard Marketplace UI

This is the judge-facing surface for the BNB hackathon build. It shows the marketplace directory, four Agent categories, the controlled hire lifecycle, and receipts for verified, blocked, and frozen outcomes.

Run from the repository root:

```bash
cd apps/marketplace
npm start
```

Then open `http://127.0.0.1:4174`.

The `src` directory is also static-host compatible. The repository includes a
GitHub Pages workflow; after Pages is enabled for the repository, every push to
`main` publishes the same judge-facing surface at the repository Pages URL.
