# Topic 3 — Platform Basics (Visual & Conceptual)

## Goal
Understand where tests run and why modern CI platforms behave the way they do.

This topic is **conceptual only** — no YAML, no Helm, no kubectl.

---

## Definition of Done
- Explain the platform hierarchy:
  Data Center → Cluster → Node → Pod → Container
- Explain containers vs VMs
- Explain what a Pod represents
- Explain how CI jobs map to Pods and Jobs
- Explain why CI compute is ephemeral
- Explain why artifacts and reports must be uploaded

---

## Core Mental Model

Workflow run → Job → Pod → Container → Test process

---

## Key Concepts Covered

### Containers vs VMs
- Containers share the host OS
- Fast startup, low overhead
- Ideal for short-lived CI workloads

### Kubernetes primitives (conceptual)
- Cluster: execution platform
- Node: machine with CPU/memory
- Pod: smallest schedulable unit
- Job: run-to-completion workload
- Volume: required for persistence

### Ephemerality
- Pods and containers are disposable
- Local disk is not durable
- CI platforms require explicit persistence

### Artifact survival
- Logs are streamed
- Artifacts must be uploaded
- Reports are promoted to external storage (Pages, GCS, etc.)

---

## Mapping to This Repo
- Playwright tests run in ephemeral CI containers
- PR runs export artifacts
- Master runs publish reports to GitHub Pages
- Slack notifications link humans to surviving outputs
