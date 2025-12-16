# Playwright Mocking Lab

A focused learning repository for **Track 1 – Topic 1: Playwright Mocking**.

This repo exists to learn and practice **API mocking in Playwright**, primarily for
UI tests and selective E2E scenarios.  
The scope is intentionally minimal, practical, and **Definition-of-Done driven**.

---

## Track 1 – Topic 1: Playwright Mocking (REST → GraphQL)

**Definition of Done (DoD)**  
This topic is DONE when I can:
- Explain the concepts clearly
- Demo them once without help
- Apply them confidently in a real Playwright test

---

## 🎯 Objective
- Understand Playwright’s network interception model
- Confidently mock REST and GraphQL APIs
- Use mocks to make UI tests fast, stable, and deterministic

---

## ✅ DoD Checklist

### 1️⃣ Mocking Fundamentals
- [ ] Explain request flow:  
  `Browser → Playwright → route / HAR → mocked response`
- [ ] Explain when mocking is appropriate
- [ ] Explain when **not** to mock (true E2E coverage)
- [ ] Explain what mocking does *not* validate

---

### 2️⃣ REST API Mocking (Primary Focus)
- [ ] Identify REST calls in browser DevTools
- [ ] Intercept a REST API using `page.route()` or `context.route()`
- [ ] Fulfill a request with custom JSON using `route.fulfill()`
- [ ] Assert UI behavior using mocked response data
- [ ] Simulate API failure using `route.abort()`
- [ ] Use `route.continue()` for passthrough requests

---

### 3️⃣ GraphQL Mocking
- [ ] Identify GraphQL requests in DevTools
- [ ] Extract `operationName` or query
- [ ] Mock a GraphQL query or mutation
- [ ] Fulfill GraphQL responses with custom data
- [ ] Assert UI behavior using mocked GraphQL response

---

### 4️⃣ Other Playwright Mocking Techniques
- [ ] Modify headers or payload before continuing a request
- [ ] Record network traffic using HAR
- [ ] Replay mocked responses using `routeFromHAR()`
- [ ] Explain pros/cons of HAR-based mocking

---

### 5️⃣ Mock Control
- [ ] Add an environment flag (e.g. `USE_MOCKS=true`)
- [ ] Toggle between mocked and real backend runs
- [ ] Run the same test in mocked vs non-mocked mode

---

## ✅ Completion Criteria
This topic is complete when:
- All relevant checklist items are ticked
- At least one UI test runs fully on mocked APIs
- I can explain the setup to another engineer

---

## Notes
- Keep implementations simple and explicit
- Avoid abstractions in this topic
- Refactoring and framework design come later


TOPICS ON HIGH LEVEL - 

- fulfill
- abort
- continue
- record har
- replay using har
- update har 
  - record only for specific url or conditions
  - record only if json structure changed
- mock toggle on off
