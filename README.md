# Playwright Mocking Lab — Track 1

This repository is a focused learning lab for **Track 1: QE / Automation Foundations**.

The goal of Track 1 is to build **strong fundamentals** using small, practical
experiments — prioritising **mental models, clarity, and definition-of-done learning**
over frameworks or abstractions.

This repo intentionally grows topic by topic and may be reused for multiple Track 1 areas.

---

## Track 1 Topics

### ✅ Topic 1 — Playwright Mocking (REST + GraphQL)
Learn how to control network reality in UI tests using Playwright:
- REST API mocking
- HAR record / replay / update
- GraphQL mocking by `operationName`
- Runtime mock toggling (`USE_MOCKS`)

📄 Details: `docs/topic-1-playwright-mocking.md`

---

### ✅ Topic 2 — GitHub Actions CI for Playwright
Learn how to run Playwright tests automatically and publish results:
- PR workflows with HTML report artifacts
- Master workflows with GitHub Pages hosted reports
- Slack notifications
- Node version consistency via `.nvmrc`

📄 Details: `docs/topic-2-github-actions-ci.md`

---

### ✅ Topic 3 — Platform Basics (Containers & Kubernetes – Conceptual)
Understand **where tests run** and **why CI behaves the way it does**:
- Containers vs VMs
- Pods, Nodes, Jobs (conceptual)
- Ephemeral compute
- Artifact and report survival

📄 Details: `docs/topic-3-platform-basics.md`

---

## Run tests locally

```bash
npm ci
npx playwright install
npx playwright test
