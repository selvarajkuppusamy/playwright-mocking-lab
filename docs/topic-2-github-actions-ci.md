# Topic 2 — GitHub Actions CI for Playwright

## Goal
Run Playwright tests automatically and publish results without manual effort.

---

## Definition of Done
- [x] PR workflow runs Playwright tests
- [x] PR workflow uploads HTML report as artifact
- [x] Master workflow runs Playwright tests
- [x] Master workflow publishes HTML report to GitHub Pages
- [x] Slack notifications sent for PR and master
- [x] Node version aligned via `.nvmrc`
- [x] CI fails when tests fail

---

## Workflows
- **PR workflow**
  - Trigger: `pull_request` → `master`
  - Output: Slack + GitHub artifact

- **Master workflow**
  - Trigger: `push` → `master`
  - Output: Slack + GitHub Pages hosted report

---

## Key Decisions
- Use `npm ci` for deterministic installs
- Use GitHub Pages (Actions source) for hosted reports
- Artifacts for PRs, Pages for master
- GitHub Slack app cards intentionally disabled


## CI Reporting Summary
## PR runs
- Playwright HTML report uploaded as a GitHub Actions artifact
- Slack notification includes artifact + run link

## Master runs
- Playwright HTML report published to GitHub Pages
- Slack notification includes Pages URL + run link