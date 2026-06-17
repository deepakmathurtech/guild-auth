import fs from 'fs';
import path from 'path';

const pagesDir = 'c:/Users/pc/Desktop/guild-web/guild-auth/src/pages';
const files = [
  'needs/NeedDetailsPage.tsx',
  'needs/NeedListPage.tsx',
  'opportunities/OpportunityListPage.tsx',
  'organizations/OrganizationListPage.tsx',
  'outcomes/OutcomePage.tsx',
  'quests/QuestDetailsPage.tsx',
  'quests/QuestListPage.tsx',
  'submissions/SubmissionQueuePage.tsx',
  'submissions/SubmissionReviewPage.tsx'
];

for (const rel of files) {
  const file = path.join(pagesDir, rel);
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix {{variable}} to {variable} in StatusBadge
  if (content.match(/status=\{\{.*?\}\}/)) {
    content = content.replace(/status=\{\{(.*?)\}\}/g, 'status={$1}');
    changed = true;
  }

  // Also fix `<StatusBadge status={{sub.status}} />` inside string interpolation
  // The regex above will catch it. e.g. status={{opp.status}} -> status={opp.status}

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed syntax in ' + rel);
  }
}
