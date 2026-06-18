# Guild OS Receptionist Operating Manual

Verified against the current `guild-auth` app on 2026-06-18.

This manual is for a user with the `receptionist` role. It describes only workflows that exist in the app code today.

## 1. Your Job

As a receptionist, you are the operating link between organizations, needs, opportunities, quests, submissions, outcomes, verification, and revenue records.

Your daily goal is simple:

1. Keep organization records accurate.
2. Capture every real need.
3. Convert valid needs into opportunities.
4. Spawn quests from opportunities.
5. Assign members to quests.
6. Review submissions.
7. Record verified outcomes and revenue.

## 2. Sign In

1. Open Guild OS.
2. Use the login screen.
3. Sign in with email/password or Google Workspace, depending on the account setup.
4. After sign-in, you should land on the Operational Dashboard.

If you are sent back to login, your account is missing an active profile or is not active.

## 3. Dashboard Workflow

Open: `Dashboard`

The receptionist dashboard shows:

- `Follow-ups`: organizations with due follow-up dates.
- `Pending Needs`: needs in `open` or `matching`.
- `Submissions`: pending quest submissions.
- `Health Alerts`: quest or organization records that need attention.
- `Action Queue`: quick links into follow-ups, need conversion, and submission review.

Use the dashboard first at the start of every shift.

Recommended sequence:

1. Handle `Health Alerts`.
2. Review `Submissions`.
3. Convert `Pending Needs`.
4. Add new organizations or needs using `New Organization` and `New Need`.

## 4. Organizations

Open: `Organizations`

Use this area to register and manage partners, businesses, NGOs, colleges, contractors, community groups, and government-related contacts.

### Add An Organization

1. Click `Add Organization`.
2. Fill required fields:
   - `Legal Entity Name`
   - `Classification`
   - `Contact Person`
3. Add phone, email, city, address, and mission description when available.
4. Click `Save Organization`.

The app creates an organization with:

- status `new`
- trust level `new`
- active archive status
- your jurisdiction
- you as owner/responsible receptionist

### Search And Filter Organizations

Use:

- search by organization name or city
- category filter
- status filter

Click `Management` to open an organization record.

### Organization Details

Inside an organization record, you can:

- click `Log Note` to record a call, meeting, visit, or note
- click `New Need` to create a need linked to that organization
- view the relationship timeline
- view contact information and active quest output

Important: every note becomes an interaction record and updates the organization's last contact time.

## 5. Needs

Open: `Needs`

Needs are raw requirements discovered from organizations.

### Log A Need

1. Click `Log New Need`.
2. Fill required fields:
   - `Title`
   - `Description`
   - `Priority`
   - `Organization`
3. Add location, city, and estimated value if known.
4. Click `Save Need`.

The need is saved as `open`.

### Process A Need

1. Find the need in `Needs Management`.
2. Click `Process`.
3. Review requirement details.
4. If the need is wrong or incomplete, click `Edit Need`.
5. If it is ready for work, click `Convert to Opportunity`.

When converting, the app opens the Opportunities create flow with the need title, description, organization, and estimated value prefilled.

## 6. Opportunities

Open: `Opportunities`

Opportunities are validated work pipelines that can produce one or more quests.

### Create An Opportunity

1. Click `Create Opportunity`, or convert from a need.
2. Fill the opportunity scope.
3. Include required skills, category, organization, revenue estimate, and assigned members when known.
4. Save the record.

### Manage An Opportunity

1. Open the opportunity with `Manage`.
2. Use `Modify Opportunity` to update title, status, or estimated revenue.
3. Add member UIDs in `Assigned Personnel` if needed.
4. Click `Spawn Quest` to create a trackable quest.

If the opportunity status is `completed`, the button changes to `Record Outcome`.

## 7. Quests

Open: `Quests`

Quests are the official mission records used for assignment, submission, verification, and closeout.

### Register A Quest

1. Click `Register Quest`.
2. Complete the wizard:
   - `Identity`: title, category, classification, priority, summary
   - `Source`: origin type, entity name, contact data
   - `Location`: remote, physical, or hybrid; city and state
   - `Personnel`: rank, member count, hours, difficulty, skills
   - `Financials`: mission value, payout, revenue, payer
   - `Protocols`: verification method, authority level, portfolio/certificate settings
   - `Outcomes`: acceptance criteria and submission channel
   - `Registry`: final review
3. Click `Commit to Federation Ledger` when readiness is at least 70%.

The app generates a Guild Quest ID like `GQ-YYYY-STATE-CITY-CAT-0001`.

### Find A Quest

Use the Quest Registry filters:

- Quest ID
- title
- classification
- paid/unpaid
- status

Click `Open Record`.

### Manage A Quest

Inside a quest record, you can:

- edit the core briefing
- update classification, objective, mode, and rank requirement
- update source and verification settings
- assign personnel using member search
- accept pending applicants with `Enlist`
- open linked need or opportunity records
- open member submissions from the verification section

Approving a member submission is the normal way to complete a quest.

## 8. Submissions And Verification

Open: `Submissions`

This queue shows only pending submissions in your jurisdiction.

### Review A Submission

1. Open `Submissions`.
2. Search by mission title or member ID if needed.
3. Click `Enter Audit`.
4. Review:
   - personnel narrative
   - evidence URLs
   - external trace links
5. Write professional reviewer notes.
6. Choose one:
   - `Authorize & Verify`
   - `Reject Submission`

### What Approval Does

When you approve:

- submission status becomes `approved`
- reviewer ID, notes, and review time are saved
- a verification record is created
- quest status becomes `completed`
- member receives reputation and XP
- member completed quest count increases
- a notification is sent to the member
- the linked opportunity may become `completed` if all mandatory quests are completed
- an outcome draft may be created
- if the quest is paid, a revenue event may be generated

### What Rejection Does

When you reject:

- submission status becomes `rejected`
- reviewer ID, notes, and review time are saved
- a verification record is created with decision `rejected`
- the quest is not completed

## 9. Outcomes

Open: `Outcomes`

Use outcomes after an opportunity is completed.

### Record An Outcome

1. Click `Record Outcome`, or open a completed opportunity and click `Record Outcome`.
2. Fill:
   - title
   - opportunity ID
   - organization
   - participants
   - evidence URLs
   - revenue generated
   - lessons learned
3. Click `Save Outcome & Revenue`.

Important rule: the linked opportunity must already have status `completed`. If not, the app blocks outcome creation.

If revenue generated is greater than zero, the app also creates a revenue event.

## 10. Revenue

Open: `Revenue`

Revenue records can be created manually in the revenue workbench, and some are created automatically:

- paid quest approval can create a quest payment revenue event
- outcome recording can create an opportunity outcome revenue event

Use revenue records to track:

- source
- opportunity ID
- organization
- amount
- date
- city
- opportunity type
- participant UIDs

## 11. Verification

Open: `Verification`

Use the verification workbench for manual verification records outside the submission review flow.

Track:

- target collection
- target ID
- method
- evidence URLs
- decision
- notes

For normal quest submissions, prefer the `Submissions` queue because it also completes quests and awards members.

## 12. Search

Use the search box in the top bar or press `Ctrl+K` / `Command+K`.

Search can find:

- organizations
- opportunities
- quests
- members

The quick navigation panel can jump to:

- Organizations
- Mission Board
- Intake Needs
- Work Pipeline

## 13. Daily Checklist

Start of shift:

1. Open `Dashboard`.
2. Check health alerts.
3. Clear pending submissions.
4. Convert ready needs.
5. Follow up with organizations.

During intake:

1. Register new organizations.
2. Log every useful call or meeting as a note.
3. Create needs from real requirements.
4. Keep statuses current.

During execution:

1. Convert needs to opportunities.
2. Spawn quests from opportunities.
3. Assign members.
4. Watch submissions.
5. Verify or reject with clear notes.

Closeout:

1. Confirm quests are completed through approved submissions.
2. Confirm opportunity status is completed.
3. Record outcome.
4. Confirm revenue event exists if value was generated.
5. Add lessons learned.

## 14. Status Meanings

Organizations:

- `new`: registered but not yet developed
- `contacted`: communication started
- `active`: active relationship
- `partner`: trusted partner relationship
- `inactive`: not currently active

Needs:

- `open`: captured and waiting
- `matching`: ready for matching
- `assigned`: assigned for processing
- `inProgress`: actively being worked
- `completed`: resolved
- `converted`: moved into opportunity flow
- `archived`: hidden from active work

Opportunities:

- `draft`: not ready
- `open`: ready for matching
- `matching`: finding people/resources
- `assigned`: personnel assigned
- `inProgress`: work moving
- `completed`: ready for outcome
- `archived`: hidden from active work

Quests:

- `draft`: not fully active
- `open`: members can apply or be assigned
- `assigned`: at least one member is assigned
- `inProgress`: active work
- `underReview`: awaiting verification
- `completed`: approved and finished
- `closed`: administratively closed
- `cancelled`: stopped
- `archived`: hidden from active work

Submissions:

- `pending`: needs receptionist review
- `approved`: accepted and verified
- `rejected`: declined with notes

## 15. Operational Rules

1. Do not approve weak evidence.
2. Always write reviewer notes.
3. Prefer creating a need before creating an opportunity.
4. Prefer spawning quests from an opportunity, not as isolated work.
5. Keep organization notes current.
6. Use the submission queue for quest completion.
7. Record outcomes only after opportunity completion.
8. Use revenue records for money/value tracking.
9. Archive old records instead of deleting them.

## Verification Log

The following manual sections were checked against the app source while writing.

| Manual Area | Verified In App Source | Result |
| --- | --- | --- |
| Receptionist dashboard KPIs and action queue | `src/components/dashboards/ReceptionistDashboard.tsx` | Matches |
| Receptionist navigation access | `src/components/AppShell.tsx` | Matches |
| Route paths | `src/App.tsx` | Matches |
| Organization creation fields | `src/pages/organizations/OrganizationCreateForm.tsx` | Matches |
| Organization list filters/actions | `src/pages/organizations/OrganizationListPage.tsx` | Matches |
| Organization notes and new need action | `src/pages/organizations/OrganizationDetailsPage.tsx` | Matches |
| Need creation fields | `src/pages/needs/NeedCreateForm.tsx` | Matches |
| Need processing/edit/convert action | `src/pages/needs/NeedDetailsPage.tsx` | Matches |
| Opportunity list and create entry | `src/pages/opportunities/OpportunityListPage.tsx` | Matches |
| Opportunity edit, member assignment, spawn quest, record outcome | `src/pages/opportunities/OpportunityDetailsPage.tsx` | Matches |
| Quest registry filters and register action | `src/pages/quests/QuestListPage.tsx` | Matches |
| Quest registration wizard steps and commit rule | `src/pages/quests/QuestRegistrationWizard.tsx` | Matches |
| Quest details assignment, applicants, verification links | `src/pages/quests/QuestDetailsPage.tsx` | Matches |
| Pending submissions queue | `src/pages/submissions/SubmissionQueuePage.tsx` | Matches |
| Submission approval/rejection screen | `src/pages/submissions/SubmissionReviewPage.tsx` | Matches |
| Approval side effects | `src/services/workflowService.ts` | Matches |
| Outcome creation and completed-opportunity rule | `src/pages/outcomes/OutcomePage.tsx` | Matches |
| Manual verification and revenue workbench fields | `src/pages/WorkbenchPage.tsx` | Matches |
| Search behavior and quick navigation | `src/components/GlobalSearch.tsx` | Matches |
| Audit/create/update/archive behavior | `src/lib/repository.ts` | Matches |

