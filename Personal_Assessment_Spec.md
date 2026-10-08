# Personal Assessment App — Project Spec (v2, Two Front Doors)

Owner: Intentional Ministries (serving Full Count Ministries groups and the public)
Stack: Supabase (database + backend), GitHub (source control), Vercel (hosting)
Platform:
- **Full Count door:** mobile web only — single responsive-for-mobile layout, no separate desktop design.
- **Intentional Ministries door:** phone-first AND designed to look right on desktop. This is a
  deliberate exception to the mobile-only rule and applies to the Intentional Ministries door only.

---

## 1. Purpose

A self-evaluation tool. Participants take an assessment once (baseline) and again later (retake), and see a
personal before-and-after comparison. It is one app with one database and **two front doors**:

- **Full Count door** — for men's and high school discipleship groups. The ministry admin can run
  group-level, region-level and category-level reports (averages + range) without seeing individual
  identities in aggregate reports.
- **Intentional Ministries door** — for individual adults who visit the Intentional Ministries website and
  are not in a Full Count group. These visitors never see Full Count branding, regions, or groups.
  The admin sees overall (combined) reports only.

Everything a person does is tagged with the door it came through, and the two doors' data never mix
(Section 3, "Doors").

---

## 2. Roles

There are exactly **two** roles with login credentials, both the same person today (the owner):

- **Full Count Admin** — opens only Full Count reports and tools.
- **Intentional Ministries Admin** — opens only Intentional Ministries reports.

Each admin has its **own** access code and its **own** login (separate session cookies, signed with the
door's name), so a login for one door can never open the other. No group leader accounts or logins.

Participants:
- **Full Count participants have no passwords or PINs.** They identify themselves with a lightweight code
  (Section 3 and 4): Region + Group Number + first name + last four of phone (or first name + last four
  for the standalone path).
- **Intentional Ministries participants have a 4-digit PIN** they create when they start their first
  assessment (Section 4B). It exists because that door is public.

---

## 3. Data Structure

### Doors
Every participant, submission, and response carries a `door` value: `fullcount` or
`intentionalministries`. All pre-existing data is `fullcount`.

- Lookups are separated by door. An Intentional Ministries visitor can never match a Full Count
  participant or see a Full Count region or group name. The same first name + last four on the two doors
  counts as two different people.
- Uniqueness rules in the database account for the door.
- Full Count reports, group totals, and "General" pools include only Full Count responses. Intentional
  Ministries reports include only Intentional Ministries responses.

### Ministry
The top level of the hierarchy: Ministry > Category > Region > Group. Fixed to a single ministry
("Full Count") for now — there is no admin UI to create additional ministries (deferred; see Section 10).

### Category
A top-level grouping (within a Ministry) that determines which question set is used and enables global
rollup reporting. Examples: "Men", "High School". Open-ended — admin can create new categories as needed.
Not visible to or entered by participants. The "Men" category's question list is the single adult list
(Section 5A), which the Intentional Ministries door also uses.

### Region
A named batch of groups created together by the admin, tagged to a Category (Full Count door only).
Example: "TN2026" (Category: High School).

### Group Number
An individual group within a Region (Full Count door only). Example: "TN2026" + "03".

- Groups are created in batches: admin picks a Category, types a Region name, and specifies how many
  groups to create (e.g., 7). System creates numbered records 01–07 under that Region.
- **Adding more groups later never regenerates existing groups.** There is a separate "Add Groups" action
  per Region that only appends new numbered groups. Existing groups and their data are never touched or
  renumbered.
- Region, Group Number, and first name matching is case-insensitive and trims leading/trailing spaces
  (e.g., "tntest", "TNTest", " TNTEST " all match the same record).

### Standalone / "General" Track (Full Count door only)
A special always-existing pseudo-group for Full Count participants taking the assessment independently.
They enter first name + last four of phone (no Region/number) and answer "Are you in high school or are
you an adult?", which determines the question set (Men or High School) and files them into a "General"
pool, split by category and by year (e.g. "General 2026").

Intentional Ministries participants are NOT in a General pool; they are reported on the Intentional
Ministries admin (Section 8B).

### Participant Identity
- **Full Count:** Region + Group Number (skipped for standalone) + first name (case-insensitive,
  trimmed) + last four of phone. Looked up on every submission to determine first-time vs. retake vs.
  already-completed. A standalone person's category is fixed when first created and always wins over
  whatever category is selected on a later visit.
- **Intentional Ministries:** first name (case-insensitive, trimmed) + last four of phone + 4-digit PIN.
  All three together are the identity: two strangers with the same name and number who choose different
  PINs are two separate people, and nothing ever reveals that another person exists. (If two people
  share name, number AND PIN, they would land in the same record — about 1 in 10,000.)

---

## 4. Entry Flow

### 4A. Full Count door — `/fullcount`

**Home screen:** heading "Personal Assessment" with "Full Count" beneath it, explanatory copy, and three
buttons: **"I'm in a group"**, **"I'm on my own"**, **"I'm returning"**, plus an **Admin access** link.
(Old addresses `/start` and `/admin` redirect to `/fullcount/start` and `/fullcount/admin`.)
This door is kept out of search engines (noindex tag, header, and robots.txt).

**Fields (typed):** Region and Group Number (group path only), First Name, Last Four of Phone. No PIN.

**Identity lookup outcomes:**

| Existing records found | Behavior |
|---|---|
| None | First-time assessment. Goes straight into questions (Men category asks married/children first). |
| One (baseline only) | Retake confirmation screen, then questions. |
| Two (baseline + retake) | 3-option prompt: see my results again / start a new assessment / return home. |

**First-time completion** shows the person their own results immediately (single Score column, no Change),
including their own goal, with Download PDF and Email options.

**Retake confirmation:** "You're about to complete the final part of your assessment…" with their goal
shown back. Married/children status is asked ONCE at baseline and reused automatically on the retake.

**"I'm returning":** asks only first name + last four, looks the person up across the Full Count door.
If several match, shows a pick-list (Region/Group or "On your own"). One completed baseline → "see results
from last time, or complete the final assessment"; completed pair → "review final results, or start a new
assessment"; no match → offer the normal entry paths.

**Before submitting**, every assessment (baseline and retake) shows a review screen of the answers from
the current sitting only, with the ability to change any answer.

### 4B. Intentional Ministries door — `/` (front screen) and `/assessment`

Branding: Intentional Ministries only (navy `#253551`, light gray `#ccd0d6`, accent blue `#7993c2`,
Barlow Condensed headlines, Barlow body; logo from `public/brand/im-logo.*`, text wordmark until then).
No mention of Full Count, regions, or groups anywhere, including emails and PDFs. No Admin link on any
public screen. A link back to intentionalministries.com. Indexable by search engines, with its own title
and description.

**Front screen:** explains what the assessment is, that it is taken once now and again later to see
progress, that individual answers are private, and what the person needs (first name, last four of phone,
and a 4-digit PIN). Two buttons: **Begin** and **I'm returning**.

**Begin:** first name, last four, and a new 4-digit PIN typed twice. The screen states plainly that a
forgotten PIN means no way back in, and to write it down. Goes straight into the individual path using
the adult question list (no high school/adult question, no group fields). Same flow as the Full Count
individual path: questions → review → results (with their own goal) → PDF/email.

**I'm returning:** first name + last four + PIN, then the same outcomes as above (see results, complete
the final assessment, review final results, start a new assessment).

**PIN rules:** stored only as a salted bcrypt hash (never in plain text, never in emails or PDFs), checked
inside the database, never in the browser. Failed or unmatched attempts are counted per name+number in the
database; 8 in 15 minutes locks that name+number for 15 minutes, with the same generic message whether or
not such a person exists. A forgotten PIN cannot be recovered.


**If the page reloads mid-assessment** (pull-to-refresh, a phone dropping the tab): on both doors the person
returns to the same questions with their saved answers. The browser tab remembers (until the tab closes) their
first name, last four and where they were. The PIN is never stored: on the Intentional Ministries door they type
the PIN again and the database checks it before they continue. The app never reloads itself mid-assessment
(the version check runs only on the front screens), and pull-to-refresh is switched off on the entry and
question screens.

---

## 5. Question Sets

Question lists are stored once and read by the door/category that uses them. A person only ever sees (and
reports only ever show) questions from the list they actually took.

### 5A. Adult Assessment — Final List (42 questions + Goal)
Used by the Full Count **Men** category and by the **Intentional Ministries** door (men and women use the
same list). A score of 5 is always the strong answer.

**Spiritual Disciplines**
1. Do you read the Bible daily?
2. Do you have a daily prayer time?
3. Do you memorize scripture?
4. Do you regularly fast?
5. Do you regularly journal?
6. Do you give generously? (tithe)
7. Are you regularly involved (attending) in a local church?
8. Do you take regular, intentional rest (Sabbath)?
9. Do you leave margin in your schedule for God and the good things, rather than overscheduling yourself and your family?

**Heart and Identity**
10. Do you find your identity and worth in Christ rather than in performance, appearance, or approval?
11. How close do you feel to God right now?
12. Are you free from bitterness or unforgiveness toward anyone?
13. How would you rate your emotional health (anxiety, discouragement, loneliness)?

**Community and Accountability**
14. Do you regularly meet with other believers?
15. Does someone know your real struggles and ask you hard questions?
16. Are you honest with others about your real struggles?

**Outward-Facing Faith**
17. Do you know how to share your faith with others?
18. Are you intentional about investing in those around you?
19. Do you give of your time (serve) at a local church or ministry?
20. Do you represent Christ well and influence others positively at work (or wherever you spend your days)?

**Personal Holiness**
21. Are you disciplining yourself for godliness?
22. How would you rate the health of your social media habits?
23. Rate your purity from pornography and sexual content (including sex scenes in shows, movies, and online).
24. Rate your thought life.
25. Are you free from anything that controls you (alcohol, drugs, vaping, gambling, gaming, spending, or any other habit)?
26. How well do you control or manage your anger?

**Time and Financial Stewardship**
27. Do you manage your time well?
28. How is your financial health (consumer debt, budget, savings)?
29. Are you honest and above reproach at work and with money?

**Marriage** — *shown only if the participant indicates "married: yes"*
30. Do you pray with your spouse regularly?
31. Do you put your spouse's needs above your own?
32. Do you regularly go on dates with your spouse?
33. Are you leading your family spiritually?
34. How would you rate the overall health of your marriage?

**Family** — *shown only if the participant indicates "has children: yes"* (independent of marital status)
35. Are you patient with your family?
36. Are you spending quality time with your family?
37. Are you intentional in discipling your children?

**Single** — *shown only if the participant indicates "married: no"*
38. Do you practice purity in your dating relationships?
39. Are you intentional about who you date, rather than dating without direction or purpose?
40. Do you have a clear understanding of what you're looking for in a future spouse?

**Physical Health**
41. Do you eat healthy?
42. Do you regularly exercise?

**Goal** (free text, private, optional — see Section 7)

Question counts a person sees: single, no children 34; married, no children 36; married with children 39;
single with children 37.

The previous Men's list was retired (kept in the database but hidden; never shown or reported). The
database only hands out active questions, and completion/reporting ignore retired ones.

### 5B. High School Assessment — Final List (Full Count door only)

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

**Goal** (free text, private, optional — see Section 7)

No branching logic for the High School list.

---

## 6. Response Scale

- Standard scale: 1–5 (1 = weak, 5 = strong).
- **No N/A option anywhere.** Every question — universal or conditionally shown — is mandatory 1–5.

---

## 7. Goal Field

- Optional free text at the end of the assessment.
- The person sees their **own** goal plainly in their own results (screen and PDF/email), on both doors,
  and sees their baseline goal again at the start of their retake.
- **Full Count admin:** goals appear only on a single group's report (on screen and in the Full Count
  report PDF), as plain anonymous lists split into Baseline and Retake, with no names attached. They
  never appear in Region-wide, Category-wide, or General reports.
- **Intentional Ministries admin:** goals are never shown.

---

## 8. Admin Access and Functions

### Common to both admins
- Each door has its own admin access code, held in its own server environment variable
  (`ADMIN_ACCESS_CODE_FULLCOUNT`, `ADMIN_ACCESS_CODE_INTENTIONALMINISTRIES`), compared on the server only
  (never sent to the browser), case-insensitive.
- Separate session cookies per door, each signed with the door's name (12-hour sessions).
- Wrong-guess limits, stored in the database so they hold on serverless hosting: 5 wrong per IP address per
  15 minutes, plus 25 wrong per door per hour across all addresses.

### 8A. Full Count admin — `/fullcount/admin` (Admin link on the Full Count home screen)
- Create a new Category; create a new Region under a Category with N groups; add groups to a Region
  (append-only).
- Reports are click-driven: a Region (combined, with expandable per-group rows), a Category (all regions),
  or a "General {year}" pool — each opens on its own page.
- A single group's view also shows a plain "Completed So Far" list of first names (no counts) and the
  anonymous Goals lists. The names list never appears in any PDF.
- Report shows, per question: average score, range, and response count.
- Married/has-children/single status is never a report grouping.
- **Point-in-time averages vs. growth/change averages (critical distinction):** a report may show two
  different kinds of numbers for a question and they must never be blended:
  - *Point-in-time average* — the average of everyone who answered that question at a given snapshot
    (all baseline responses, or all retake responses, calculated independently). This can include
    different people at each snapshot.
  - *Growth/change average* — how much a group moved on a question, calculated ONLY from participants who
    answered that specific question at BOTH baseline and retake. A participant who answered a question
    at only one time point is excluded entirely from that question's growth figure, in both directions;
    their data still appears in the point-in-time snapshot(s) and in their own individual report.
- Reports are sectioned by question category (Marriage together, Single together, etc.).
- Delivery: view on screen, download PDF, or email to self. PDF: a Region PDF starts with the combined
  total page, then one page per group (each group's pages end with its Goals lists).
- Only Full Count responses are ever included.

### 8B. Intentional Ministries admin — hidden address
- Reached only at an unguessable address held in the `IM_ADMIN_PATH` environment variable (not in the
  source code). Linked from no public screen, kept out of robots.txt, marked noindex; any other address
  is a plain "not found".
- One simple overall report: no groups, no regions, no names, no goals. Per question: point-in-time
  average, range and response count, plus growth numbers using the same matched-participant rule as 8A.
  An optional year choice narrows the report to people who started in that year.
- Delivery: on screen, PDF, or email to self (sent as "Intentional Ministries").
- Only Intentional Ministries responses are ever included.

---

## 9. Individual (Non-Admin) Reporting

- Every participant sees their own results immediately after finishing a baseline (their scores and goal)
  and a before-and-after comparison after finishing a retake.
- Delivery: email to self or download PDF (on phones, PDFs open through the native share sheet so they can
  never trap the person on a PDF screen). The PDF shows the Change indicator as a drawn arrow, not a
  text glyph.
- Emails are branded by door: Intentional Ministries visitors get Intentional Ministries branding and a
  sender name of "Intentional Ministries" with no Full Count mention; Full Count emails are unchanged.
  Both are sent from the same verified mail domain.
- PINs never appear in any email or PDF.
- Individual reports are never visible to admins or leaders in aggregate views.

---

## 10. Explicitly Deferred (not building now)

- Group leader logins / self-service group leader accounts
- Per-ministry admin accounts (multi-tenant self-service)
- White-label / configurable colors or logo per ministry beyond the two doors
- Public self-service signup for outside organizations
- Billing / subscription tiers
- Full multi-ministry support beyond the admin manually creating additional ministries in Supabase directly
- PIN recovery / reset (a forgotten PIN is intentionally unrecoverable)

---

## 11. Open Items

All design decisions for this version are resolved. Any new open items will be added here as they come up.
