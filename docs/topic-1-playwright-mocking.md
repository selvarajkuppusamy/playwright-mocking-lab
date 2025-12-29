# Topic 1 — Playwright Mocking (REST → GraphQL)

## Goal
Learn and practice **API mocking in Playwright** for UI tests and selective E2E scenarios.

The scope is intentionally minimal, practical, and **Definition-of-Done driven**.

---

## Definition of Done (DoD)

This topic is DONE when I can:
- Explain the concepts clearly
- Demo them once without help
- Apply them confidently in a real Playwright test

---

## Mental Model
Browser → Playwright → Network interception → UI behavior  
Mocks **replace the backend**, not the UI or user flows.

---

## 1. Mocking Fundamentals
- [x] Understand request flow: Browser → Playwright → route / HAR → response
- [x] Know when mocking is useful (UI isolation, stability, speed)
- [x] Know when NOT to mock (true E2E, backend validation)
- [x] Understand what mocking does NOT test (backend logic, contracts)

---

## 2. REST API Mocking
- [x] Identify REST calls using DevTools (Network tab)
- [x] Intercept REST APIs using `page.route()` / `context.route()`
- [x] Fulfill requests with custom JSON using `route.fulfill()`
- [x] Assert UI behavior driven by mocked data
- [x] Simulate API failures using `route.abort()`
- [x] Allow real network using `route.continue()`
- [x] Modify headers or payload before continuing a request

---

## 3. HAR-based Mocking
- [x] Record network traffic to HAR
- [x] Replay API responses using `routeFromHAR()`
- [x] Explain `embed` vs `omit` vs `attach`
- [x] Update HAR entries using `update: true`
- [x] Restrict HAR to specific URLs
- [x] Understand update side effects
- [x] Validate response structure (shape/signature check)

---

## 4. GraphQL Mocking
- [x] Identify GraphQL requests and operation names
- [x] Intercept GraphQL POST requests
- [x] Mock GraphQL queries and mutations
- [x] Fulfill GraphQL responses with custom data
- [x] Assert UI behavior using mocked GraphQL responses
- [x] Understand UI challenges with GraphiQL / CodeMirror editors

---

## 5. Mock Toggle / Control
- [x] Add `USE_MOCKS` environment flag
- [x] Run same tests in real vs mocked mode
- [x] Control mocking behavior at runtime (not per test)
- [x] Log whether tests are running in mocked or real mode

---

## Notes
- Keep implementations simple and explicit
- Avoid abstractions in this topic
- Refactoring and framework design come later