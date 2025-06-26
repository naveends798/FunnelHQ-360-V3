# FunnelHQ 360 – Clerk + Supabase Auth & User‑Management Implementation Prompt  
*(For Claude Code – provide this entire prompt)*  

---

## 1. Context  

You are “**Claude Code**”, acting as a senior full‑stack engineer.  

**Important:** The product owner is **not a developer**; therefore every action should be explained in simple, step‑by‑step terms with copy‑paste‑ready commands and no assumed prior knowledge.
The FunnelHQ 360 web‑app UI and front‑end logic are already laid out in Next.js/React. The back‑end is **green‑field** and will be built with **Supabase**.  
We will integrate **Clerk** for authentication, organisation & member management.  

Your tasks must be executed **step‑by‑step**, explaining **what** you did, **why** you did it, and pausing for the next confirmation before proceeding to the next numbered step (unless told to continue). Use terse, numbered commit‑style summaries.  

---

## 2. High‑Level Goals  

1. **Phase 1 – Clerk Integration**  
   * Sign‑up / login with email‑password, magic‑link & OTP.  
   * Session management via Clerk JWT.  
   * User profiles & custom metadata.  
   * Organisations, invitations, membership roles.  
   * Granular role‑based UI rendering hooks.  
   * Email templates & webhooks for invite / passwordless flows.  

2. **Phase 2 – Supabase Back‑End**  
   * Fresh Supabase project & SQL schema.  
   * Row Level Security (RLS) enforced through Clerk‑issued JWT claims.  
   * Tables: `users`, `organisations`, `projects`, `memberships`, `plans`, `subscriptions`, `invites`, `usage`.  
   * Business logic for 14‑day **Pro Trial**, **Solo** & **Pro** plans.  
   * Stripe (stub) webhook listener ready for future billing integration.  

---

## 3. Plans & Limits  

| Plan | Price | Projects | Storage | Team members | Support | Notes |  
|------|-------|----------|---------|--------------|---------|-------|  
| **Pro (paid)** | TBD | Unlimited | 100 GB | Unlimited | Priority | Default after trial if upgraded |  
| **Solo (paid)** | TBD | 3 | 5 GB | 0 team‑mates | Standard | Cheaper tier |  
| **Pro Trial (free 14 days)** | ₹0 | Same as Pro | Same as Pro | Same as Pro | Priority | Auto‑created at sign‑up; non‑renewable |

*Day‑14 behaviour:* lock all routes except **/billing** & **/support**, show upgrade banner.  

---

## 4. Roles & Permissions  

| Role | How created | Abilities | Supabase RLS claim |  
|------|-------------|-----------|--------------------|  
| **admin** | First user in org | Full CRUD, invite others, billing | `role='admin'` |  
| **team_member** | Invited by admin | Read/write on **assigned projects only** | `role='team_member'` |  
| **client** | Invited per‑project | Read‑only on relevant project | `role='client'` |  

Edge‑case notes:  
* enforce seat limits (Solo = 0 team, Pro = ∞).  
* downgrade Pro→Solo: deactivate extra projects, disable team members.  
* email change retains org membership.  
* invitation link expiry (48 h).  
* re‑signup with existing email resumes trial countdown (no reset).  
* soft‑delete users retains audit logs.  

---

## 5. Detailed Step Plan  

### Phase 1 – Clerk

1. **Bootstrap Clerk SDK** in Next.js root, env vars (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).  
2. **Auth Components** – replace placeholder login/registration with `<SignUp/>`, `<SignIn/>` components.  
3. **Custom Magic‑link & OTP UI** – extend Clerk UI via `appearance` prop.  
4. **Organisation Logic** – enable multi‑organisation in dashboard, set default org on first sign‑in.  
5. **Invitation Flow** – implement `createOrganizationInvitation` & accept via secure link.  
6. **Role Metadata** – store `role`, `plan`, `trialEndsAt` in `publicMetadata`.  
7. **Webhooks** – configure `user.created`, `invitation.accepted` → call Supabase RPC stubs.  
8. **Client‑side Hooks** – `useAuth`, `useUser`, `useOrganization` to gate routes & components.  
9. **Unit Tests** – Jest + React‑Testing‑Library for role‑based redirection.

### Phase 2 – Supabase

1. **Create project & set JWT secret** identical to Clerk JWT signing key.  
2. **SQL Schema** (run migration scripts):
   ```sql
   create table organisations (
     id uuid primary key default uuid_generate_v4(),
     clerk_org_id text unique,
     name text,
     plan text,
     trial_ends_at timestamptz,
     created_at timestamptz default now()
   );
   -- further tables …
   ```  
3. **RLS Policies** – example for `projects`:  
   ```sql
   create policy "project members only"
     on projects for select
     using (organisation_id = current_setting('request.jwt.org_id', true)::uuid
            and (role = 'admin'
                 or role = 'team_member' and id = any(current_setting('request.jwt.project_ids', true)::uuid[])));
   ```  
4. **Supabase Functions** – `handle_subscription_change`, `handle_invite_accept`.  
5. **Seeder** – insert default plans (`Solo`, `Pro`).  
6. **Edge Functions** – `/stripe/webhook`, `/clerk/webhook`.  
7. **Storage** – buckets scoped by organisation, storage quota triggers.  
8. **Monitoring & Logs** – enable Supabase log retention, realtime dashboards.  

---

## 6. Output Format Expectations  

Claude Code **MUST**:  

* Work through each numbered step *serially*.  
* After each step, respond in this template:  

  ```
  ### Step <n> Complete – <Title>
  **What was done**: <1‑3 lines>  
  **Why**: <reasoning>  
  Proceed to Step <n+1>? (yes/no)
  ```  

* Wait for explicit “yes” before continuing (except when `continue` flag is provided).  
* Provide code snippets & shell commands in fenced blocks with file paths.  
* Use concise commit messages: `feat: add Clerk org invitations`.  

---

## 7. Edge‑Cases & Extras to Cover  

* **Abandoned Trial** – cron job disables org after 30 days inactivity.  
* **Over‑usage** – prevent storage > plan quota (trigger Supabase function).  
* **Concurrent Invites** – invitation limit per org to avoid spam.  
* **Account Deletion** – 30‑day grace, soft‑delete.  
* **Data Residency** – note EU region compliance optional flag.  
* **Rate Limiting** – enable Clerk rate‑limit & Supabase WAF.  

---

## 8. Non‑Functional Requirements  

* TypeScript everywhere; ESLint + Prettier.  
* CI pipeline (GitHub Actions): lint → unit‑test → deploy preview.  
* Infrastructure IaC: Terraform or Supabase CLI & Clerk CLI scripts stored in `/infra`.  
* Documentation automatically generated via `typedoc` & lives under `/docs`.  

---

## 9. Kick‑Off  

Begin with **Phase 1 – Step 1**.  
Remember: *explain, justify, await confirmation*.  

---  
*End of prompt.*  
