# TODO - Open Source Quest expansion

## Phase 1 (Completed)
- [x] Read guild-auth quest system: QuestListPage, QuestDetailsPage, QuestRegistrationWizard
- [x] Read guild-auth domain logic: services/workflowService.ts, types/guild.ts
- [x] Read theguild quest system pages: QuestBoard, QuestDetails, QuestApplications, MyQuests, SubmissionReviewQueue
- [x] Read theguild public domain logic: theguild/src/lib/repository.ts
- [x] Read guild-auth Firestore rules: firestore.rules
- [x] Build initial dependency map

## Phase 2 (Approved) - Implementation plan
- [ ] Add backward-compatible quest discriminator: quests.questType (standard default)
- [ ] Add Open Source quest config: quests.openSourceTeamRoles (optional)
- [ ] Add participant role/app fields for Open Source quests (optional, without breaking existing applicants/acceptedMembers)
- [ ] Implement shared transaction-based accept/join helper with slot enforcement (active slots: total 3; 1 openSource + 2 standard)
- [x] Implement guild-auth accept flow to use the helper


- [ ] Update theguild apply/accept flow(s) to use the helper (no more direct arrayUnion/arrayRemove for acceptance)
- [ ] Frontend validation + UX messaging for slot rules
- [ ] Add guild-auth quest creation UI:
  - [ ] “Quest Type” select: Standard Quest / Open Source Quest
  - [ ] Role builder with default roles + custom roles
- [ ] Add theguild Open Source quest discovery + application UX:
  - [ ] show mission, goals, team structure, available roles, requirements
  - [ ] apply by selecting role + motivation/experience/portfolio + custom Q answers

## Phase 3 - Code implementation
- [ ] Update data types in both repos (guild-auth/types/guild.ts and theguild/types/guild.ts)
- [ ] Implement shared transaction helpers (likely duplicated per repo initially, but same logic)
- [ ] Wire UI into new flows
- [ ] Update dashboards:
  - [ ] Extend MyQuests to “My Active Quests” view and include Open Source/Standard breakdown
  - [ ] Add Team Workspace placeholders on acceptance

## Phase 4 - Migrations & backward compatibility
- [ ] Ensure existing quests without questType behave as standard
- [ ] Backfill defaults only if needed (optional)

## Phase 5 - Testing
- [ ] Unit tests for slot enforcement rules
- [ ] Integration tests for accept/join workflow
- [ ] Permission tests for Firestore updates
- [ ] Migration tests/backward compatibility tests

## Phase 6 - Production readiness
- [ ] Risk review & future enhancement notes

