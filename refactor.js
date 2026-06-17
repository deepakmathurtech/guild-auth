import fs from 'fs';
import path from 'path';

const pagesDir = 'c:/Users/pc/Desktop/guild-web/guild-auth/src/pages';
const files = [
  'organizations/OrganizationListPage.tsx',
  'organizations/OrganizationDetailsPage.tsx',
  'needs/NeedListPage.tsx',
  'needs/NeedDetailsPage.tsx',
  'opportunities/OpportunityListPage.tsx',
  'opportunities/OpportunityDetailsPage.tsx',
  'quests/QuestListPage.tsx',
  'quests/QuestDetailsPage.tsx',
  'submissions/SubmissionQueuePage.tsx',
  'submissions/SubmissionReviewPage.tsx',
  'outcomes/OutcomePage.tsx'
];

for (const rel of files) {
  const file = path.join(pagesDir, rel);
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace <table> with <table className="responsive-table">
  if (content.includes('<table>')) {
    content = content.replace(/<table>/g, '<table className="responsive-table">');
    changed = true;
  }

  // Very naive approach to add StatusBadge import if role-pill is there
  if (content.includes('role-pill')) {
    if (!content.includes('StatusBadge')) {
      const depth = rel.split('/').length;
      const relativeDots = '../'.repeat(depth);
      content = `import { StatusBadge } from '${relativeDots}components/StatusBadge';\n` + content;
    }
    
    // Replace <span className="role-pill">{status}</span> with <StatusBadge status={status} />
    content = content.replace(/<span\s+className=(["'`])(?:role-pill.*?)["'`]\s*>([^<]+)<\/span>/g, '<StatusBadge status={$2} />');
    
    // Sometimes it has template literals <span className={`role-pill`}>{sub.status}</span>
    content = content.replace(/<span\s+className=\{[`"']role-pill.*?[`"']\}\s*>([^<]+)<\/span>/g, '<StatusBadge status={$1} />');
    
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + rel);
  }
}
