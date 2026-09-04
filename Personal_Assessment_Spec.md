# Personal Assessment App — Project Spec (v1, Phase One)

Owner: Full Count Ministries
Stack: Supabase (database + backend), GitHub (source control), Vercel (hosting)
Platform: Mobile web only — single responsive-for-mobile layout, no separate desktop design

---

## 1. Purpose

A self-evaluation tool for men's and high school discipleship groups. Participants take an assessment
at the start of a group (baseline) and again at the end (retake), and see a personal before-and-after
comparison. The ministry admin can run group-level and category-level reports (averages + range) without
seeing individual identities in aggregate reports.

---

## 2. Roles

There is exactly **one** role with login credentials in Phase One: the **Admin** (the user of this spec).

- No group leader accounts or logins.
- No participant accounts or passwords — participants identify themselves via a lightweight code (Section 4).
- Admin accesses a protected screen via an admin access code (exact mechanism TBD — placeholder: 8-digit code).

---

## 3. Data Structure

### Ministry
The top level of the hierarchy: Ministry > Category > Region > Group. Fixed to a single ministry
("Full Count") for now — there is no admin UI to create additional ministries yet (deferred; see
Section 10). The data model supports more than one so nothing needs to be retrofitted later.

### Category
A top-level grouping (within a Ministry) that determines which question set is used and enables global
rollup reporting. Examples: "Men", "High School". Open-ended — admin can create new categories as needed.
Not visible to or entered by participants.

### Region
A named batch of groups created together by the admin, tagged to a Category.
Example: "TN2026" (Category: High School).

### Group Number
An individual group within a Region. Example: "TN2026" + "03".

- Groups are created in batches: admin picks a Category, types a Region name, and specifies how many
  groups to create (e.g., 7). System creates numbered records 01–07 under that Region.
- **Adding more groups later never regenerates existing groups.** There is a separate "Add Groups" action
  per Region that only appends new numbered groups (e.g., adds 08–09 to an existing Region of 7). Existing
  groups and their data are never touched or renumbered.
- Region + Group Number matching is case-insensitive and trims leading/trailing spaces
  (e.g., "2026men", "2026 Men", "2026MEN " all match the same record).

### Standalone / "General" Track
A special always-existing pseudo-group for participants taking the assessment independently (no group
leader, no group code — e.g., someone who stumbles onto the site without belonging to a known group).
These participants enter first name + last four of phone (no Region/number). Since there's no group
code to imply a category, this track asks one additional up-front question: "Are you in high school or
are you an adult?" — the answer determines which question set (Men or High School) is loaded, and files
the participant into a "General" pool, split by category and by year (e.g. "General 2026"), so admin can
run a General report per category per year.

### Participant Identity
No accounts. A participant is identified by:
- Region + Group Number (skipped entirely for the standalone/General track)
- First name (case-insensitive, trimmed)
- Last four digits of phone number

This combination is looked up on every submission to determine first-time vs. retake vs. already-completed.

---

## 4. Entry Flow

### Home Screen
- Privacy notice (short, plain language): individual answers are private; only group/category averages
  are visible to leadership.
- One primary button: **"Start Assessment"** (no separate "first time" vs. "retake" button — the system
  determines this automatically from the identity lookup).
- Separate button: **"Take it on your own"** → routes into the standalone/General track (skips
  Region/number fields).
- Admin access button (separate, gated by admin code — see Section 8).

### Fields (typed, not selected from a dropdown)
1. Region (e.g., "2026men") — skipped for standalone track
2. Group Number (e.g., "03") — skipped for standalone track
3. First Name
4. Last Four of Phone Number

No ministry field for participants — there is only one ministry for now, applied automatically. No
date/window restrictions — groups start and end at different times throughout the year, so there is no
enforced calendar window.

### Identity Lookup Outcomes
On submission of the identity fields, system checks for existing record(s) matching Region + Group
Number (or General) + First Name + Last Four:

| Existing records found | Behavior |
|---|---|
| None | Treated as first-time assessment. Proceeds straight into questions. |
| One (baseline only, no retake yet) | Treated as the retake automatically — no prompt needed. Shows confirmation screen first (see below), then questions. |
| Two (baseline + retake both completed) | Show a 3-option prompt (see below) instead of guessing. |

### Retake Confirmation Screen (shown when exactly one prior record exists)
Message: "You're about to complete the final part of your assessment. This will compare your answers to
what you entered previously." Options:
- View your original answers first (then proceed or back out)
- Continue to the retake questions
- Back out

If the participant set a Goal (see Section 7), it is shown to them here before they begin the retake
questions: "Here's the goal you set for yourself this year."

### Returning After a Completed Pair (baseline + retake both done)
Three plain options, no diagnostic question asked:
1. See my results again (re-displays the existing report, no new data touched)
2. Start a new assessment (archives the completed pair silently, opens a fresh baseline going forward —
   old data is archived, not deleted, and never shown to the participant again)
3. Return to home screen

---

## 5. Question Sets

Two independent, separately-maintained question lists. A group's Category (Men or High School) determines
which list is loaded — participants never choose or see this.

### 5A. Men's Assessment — Final List

**Spiritual Disciplines**
1. Do you read the Bible daily?
2. Do you have a daily prayer time?
3. Do you memorize scripture?
4. Do you regularly fast?
5. Do you regularly journal?
6. Do you give generously? (tithe)
7. Are you regularly involved (attending) in a local church?

**Community and Accountability**
8. Do you regularly meet with other believers?
9. Are you in an accountable relationship?

**Outward-Facing Faith**
10. Do you know how to share your faith with others?
11. Are you intentional about investing in those around you?
12. Do you give of your time (serve) at a local church or ministry?

**Personal Holiness**
13. Are you disciplining yourself for godliness?
14. How would you rate the health of your social media habits?
15. Rate your purity (what you watch or look at, thought life)
16. How well do you control or manage your anger?

**Time and Financial Stewardship**
17. Do you manage your time well?
18. How is your financial health (consumer debt, budget, savings)?

**Marriage** — *shown only if participant indicates "married: yes"*
19. Do you pray with your spouse regularly?
20. Do you put your spouse's needs above your own?
21. Do you regularly go on dates with your spouse?
22. Are you leading your family spiritually?

**Family** — *shown only if participant indicates "has children: yes"* (independent flag from marital status — a divorced participant may have kids without being currently married)
23. Are you patient with your family?
24. Are you spending quality time with your family?
25. Are you intentional in discipling your children?

**Single** — *shown only if participant indicates "married: no"*
26. Do you practice purity in your dating relationships?
27. Are you intentional about who you date, rather than dating without direction or purpose?
28. Do you have a clear understanding of what you're looking for in a future spouse?

**Physical Health**
29. Do you eat healthy?
30. Do you regularly exercise?

**Goal** (free text, private — see Section 7)

### 5B. High School Assessment — Final List

**Spiritual Disciplines**
1. Do you read the Bible daily?
2. Do you have a daily prayer time?
3. Do you memorize scripture?
4. Do you regularly fast?
5. Do you regularly journal?
6. Are you generous with what you have?
7. Are you regularly involved (attending) in a local church?

**Community and Accountability**
8. Do you regularly meet with other believers?
9. Are you in an accountable relationship?

**Outward-Facing Faith**
10. Do you know how to share your faith with others?
11. Are you intentional about investing in those around you?
12. Do you give of your time (serve) at a local church or ministry?

**Personal Holiness**
13. Are you disciplining yourself for godliness?
14. How would you rate the health of your social media habits?
15. Rate your purity (what you watch or look at, thought life)
16. How well do you control or manage your anger?

**Time and Stewardship**
17. Do you manage your time well?
18. Are you a good steward of the money you have?

**Spiritual Influence**
19. Do you pray with your friends or teammates?
20. Are you a spiritual influence on those around you?

**Family**
21. Are you patient with your family?
22. Are you spending quality time with your family?

**Purity and Relationships**
23. Do you honor purity in how you treat girls you like or date?
24. Are you intentional about who you spend time with romantically?

**Physical Health**
25. Do you eat healthy?
26. Do you regularly exercise?

**Baseball / Competition**
27. Do you compete with integrity, even when no one's watching?
28. Are you a good teammate, encouraging others rather than tearing them down?

**Goal** (free text, private — see Section 7)

No branching logic needed for the High School list (no marriage/kids conditional sections).

---

## 6. Response Scale

- Standard scale: 1–5 (1 = weak, 5 = strong), matching the original paper form.
- **No N/A option anywhere.** Every question — universal or conditionally-shown (Marriage, Family,
  Single sections) — is mandatory 1–5. This was considered and explicitly rejected: all conditional
  questions were judged to be answerable in every applicable case.

---

## 7. Goal Field

- Free-text field at the end of the assessment.
- Private to the individual only — never included in any group, label, or category report, and never
  visible to admin.
- Shown back to the participant automatically at the start of their retake ("Here's the goal you set for
  yourself this year") before they begin answering.

---

## 8. Admin Access and Functions

- Admin screen gated by a 7-digit access code (a verse-reference code already used internally by the
  ministry). Entered on a dedicated admin gate screen before any admin function is accessible.
- Admin functions:
  - Create a new Category (open-ended list, not limited to Men/High School)
  - Create a new Region under a Category, specifying number of groups to generate
  - Add more groups to an existing Region (append-only, never regenerates existing groups)
  - Run a report — click-driven rather than a separate form:
    - Click a Region (e.g., TN2026) → that Region's combined report, with each Group number
      (01, 02, 03...) available as an expandable row for that single group's own report
    - Click a Category name (Men, High School) → the report across every Region in that category
    - Click a "General {year}" bucket (e.g., "General 2026") → that year's standalone/General pool
      for that category
  - Report shows, per question: average score, range (low–high), and response count (e.g., "6 of 8
    responded") — critical for conditionally-shown questions where not everyone answers every question.
  - Married/has-children/single status is never a report grouping — those flags only ever control which
    questions a participant sees, never how results are bucketed for reporting.
  - **Point-in-time averages vs. growth/change averages (critical distinction):** A report may show two
    different kinds of numbers for a given question, and they must never be blended into one:
    - *Point-in-time average* — the average of everyone who answered that question at a given snapshot
      (all baseline responses, or all retake responses, calculated independently). This can include
      different people at each snapshot (e.g., a group of 5 single guys where one gets married mid-year:
      the baseline Single-section average includes all 5, the retake Single-section average includes only
      the 4 still single).
    - *Growth/change average* — how much a group moved on a question, calculated ONLY from participants
      who answered that specific question at BOTH baseline and retake. A participant who answered a
      question at only one time point (e.g., the guy who married mid-year, for the Single or Marriage
      sections) is excluded entirely from that question's growth calculation, in both directions — his
      data still appears in the relevant point-in-time snapshot(s) and in his own individual
      before-and-after report, but never in a group-level delta/change figure for a question he didn't
      answer at both points. This prevents a scenario where someone leaving or entering a conditional
      section shifts a group average in a way that looks like collective growth or decline but is actually
      just a change in who was included in the average.
  - Reports are grouped/sectioned by category of question (e.g., Marriage questions clustered together,
    Single questions clustered together) rather than interleaved, so participation-count differences are
    self-explanatory.
  - Delivery options: view on screen, download as PDF, or email to self. (Text/SMS delivery was
    considered and dropped due to inconsistent PDF handling across carriers/messaging apps.)
  - PDF report format: one page per group, plus a final combined-total page when downloading/emailing a
    whole Region.

---

## 9. Individual (Non-Admin) Reporting

- Every participant, upon completing their retake, immediately sees their own personal before-and-after
  report.
- Delivery options: email to self or download PDF.
- Individual reports are never visible to admin or leaders in aggregate views — only group/category
  averages are.

---

## 10. Explicitly Deferred to Phase Two (not building now)

- Group leader logins / self-service group leader accounts
- Per-ministry admin accounts (multi-tenant self-service)
- Subdomain-per-ministry branding (e.g., fullcount.intentionalministries.com)
- White-label / configurable colors or logo per ministry
- Public self-service signup for outside organizations
- Billing / subscription tiers
- Full multi-ministry support beyond the admin manually creating additional ministries in Supabase directly

---

## 11. Open Items

All Phase One design decisions are resolved as of this version. Any new open items will be added here as
they come up during build or future planning conversations.
