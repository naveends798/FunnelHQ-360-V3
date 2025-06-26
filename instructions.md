# Funnel Portal MVP Restructure – Task-by-Task Build Plan

> **Version: 18 June 2025 · MVP‑focused**   (White‑label features removed)

---

## 0 │ Context & Principles

| Item               | Decision                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Keep**           | Existing Express + React + Vite + Tailwind + Radix/F‑Motion + Drizzle ORM + Stripe                                                                     |
| **Remove**         | Clerk SDK and all Passport remnants (replaced by Supabase Auth)                                                                                        |
| **Add (now)**      | Supabase JS client, RBAC tables, Stats dashboard, On‑boarding form, Comment system with **@mentions & rich‑text**, File/Asset redirects, Ticket module |
| **Add (post‑MVP)** | Google OAuth, Gantt view, Chat‑bot, Wise/Razorpay adapters, installable mobile shell                                                                   |
| **Rule**           | *One data‑source, one truth*: every entity lives in Postgres via Drizzle; blobs in S3/Drive                                                            |

---

## 1 │ Roles & Permissions (single source)

Same as previous draft – no changes.

---

## 2 │ Task Breakdown

**Legend:** ✅ = in MVP scope   ❌ = post‑MVP / backlog

| #        | Epic / Task                                                       | Purpose & Steps (truncated for brevity) | MVP? |
| -------- | ----------------------------------------------------------------- | --------------------------------------- | ---- |
| **T‑0**  | De‑Clerk & Supabase switch                                        | …                                       | ✅    |
| **T‑1**  | RBAC hook rewrite                                                 | …                                       | ✅    |
| **T‑2**  | Dashboard Stats cards                                             | …                                       | ✅    |
| **T‑3**  | Live Projects filter grid                                         | …                                       | ✅    |
| **T‑4**  | Global Notifications (Realtime, rate‑limit, in‑app center)        | …                                       | ✅    |
| **T‑5**  | Team & Client management UI (invite, resend, cancel)              | …                                       | ✅    |
| **T‑6**  | Client‑only views                                                 | …                                       | ✅    |
| **T‑7**  | On‑boarding Form Builder                                          | …                                       | ✅    |
| **T‑8**  | Asset & Brand‑kit upload                                          | …                                       | ✅    |
| **T‑9**  | Inline Comments / Threads (+@mentions, image‑paste, code blocks)  | …                                       | ✅    |
| **T‑10** | Kanban (MVP)                                                      | …                                       | ✅    |
| **T‑11** | Billing (Stripe subscriptions, limits)                            | …                                       | ✅    |
| **T‑12** | Ticketing Module                                                  | …                                       | ✅    |
| **T‑13** | “Beta” ribbon & Mobile polish                                     | …                                       | ✅    |
| **T‑14** | Google OAuth toggle                                               | …                                       | ❌    |
| **T‑15** | Security Hardening (2FA, session screen)                          | …                                       | ❌    |
| **T‑16** | Audit Logs                                                        | …                                       | ❌    |
| **T‑17** | Observability (Sentry, logs bucket)                               | …                                       | ❌    |
| **T‑18** | Backups & Migrations                                              | …                                       | ❌    |
| **T‑19** | Rate‑limiting middleware                                          | …                                       | ❌    |
| **T‑20** | Email templates (Postmark)                                        | …                                       | ❌    |

> **Removed:** Former task **T‑21 (White‑label & Custom Domains)** – excluded from MVP and deleted from plan.

---

### 2A │ Integrations & API Matrix

*(unchanged – still required for MVP tasks above)*

---

### 2B │ Supabase Edge Functions

*(unchanged)*

---

### 2C │ Stripe → Supabase Sync

*(unchanged)*

---

### 2D │ CI/CD Secrets & Environments

*(unchanged – staging vs production matrices still needed even for MVP)*

---

## 3 │ File / Folder Map

*(unchanged)*

---

## 4 │ Design Language & Components

*(unchanged)*

---

## 5 │ Testing & CI

*For MVP, cover unit + E2E (desktop viewport) only. Mobile viewport & payment‑flow tests may ship a week later.*

---

## 6 │ Roll‑out

| Stage           | Branch                        | Who tests               |
| --------------- | ----------------------------- | ----------------------- |
| **Dev**         | `feat/supabase-auth`          | Internal devs           |
| **Alpha (MVP)** | `mvp` on Vercel Preview       | Agency PM & design team |
| **Beta**        | `main` – flag `APP_BETA=true` | First client cohort     |

---

## 7 │ Future Backlog (post‑MVP)

- Google OAuth (T‑14)
- Security & Compliance hardening (T‑15 → T‑20)
- Gantt timeline, chat‑bot, Wise payouts, installable mobile shell
- White‑label & custom domains (deferred)

---

### 🎯 **MVP Task List**

`[T‑0 → T‑13]` inclusive – once these are complete, the Funnel Portal is feature‑complete for first customer usage.
