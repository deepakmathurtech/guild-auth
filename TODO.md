# Guild Identity Resolution UX Pass — TODO

## Phase 1: User Directory (compile-first)
- [ ] Add new Founder-first user directory page (or refactor MemberManagementPage) named `UserDirectoryPage`.
- [ ] Implement centralized search + filters: name, email, username, phone, role, branch, organization, trust level, verification.
- [ ] Implement directory columns: Name, Role, Branch, Organizations, Trust, Verification, Activity, Last Active, Profile Completion.
- [x] Add quick view modal (read-only) with key fields (no assignment actions yet).
- [x] Wire navigation from existing dashboard/menu to the new directory page.


## Phase 2: Role Assignment Wizard
- [ ] Implement `RoleAssignmentWizard` with workflow: search user → review profile → choose action → confirm.
- [ ] Implement actions: Promote, Demote, Transfer, Assign Jurisdiction, Assign Receptionist, Assign Guild Master.

## Phase 3: Receptionist Assignment UX
- [ ] Add receptionist candidate cards with workload/health/trust metrics.
- [ ] Integrate receptionist candidate picker into wizard.

## Phase 4: Guild Master Assignment UX
- [ ] Add GM candidate cards with experience/branch metrics/trust/leadership metrics.
- [ ] Integrate GM candidate picker into wizard.

## Phase 5: Organization Search + Actions
- [ ] Extend organization list/search to support required filters.
- [ ] Add actions list: Assign, Transfer, Verify, Archive, View.

## Phase 6: Build validation
- [ ] Run `npm.cmd run build` in `guild-auth`.
- [ ] Fix TS/ESLint/build errors until clean.

## Final report
- [ ] Update `report.md` / `validation-report.md` with:
  - [ ] User Directory Improvements
  - [ ] Search Improvements
  - [ ] Assignment Improvements
  - [ ] Founder UX Improvements
  - [ ] Receptionist Assignment Improvements
  - [ ] Guild Master Assignment Improvements
  - [ ] Build Results
  - [ ] Updated Readiness Score

