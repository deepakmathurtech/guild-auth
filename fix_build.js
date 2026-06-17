import fs from 'fs';
import path from 'path';

const basePath = 'c:/Users/pc/Desktop/guild-web/guild-auth/src';

function replaceInFile(relativePath, regex, replacement) {
  const p = path.join(basePath, relativePath);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(p, content);
}

// 1. MemberDashboard.tsx -> change 'published' to 'open'
replaceInFile('components/dashboards/MemberDashboard.tsx', /o\.status === 'published'/g, "o.status === 'open'");

// 2. MemberSearch.tsx -> listRecords<GuildUser>('users', ...) wait, listRecords doesn't take generic type if EntityMap is mapped.
// Wait, listRecords takes <K extends keyof EntityMap> so it should be listRecords('users', ...) without <GuildUser>
replaceInFile('components/MemberSearch.tsx', /listRecords<GuildUser>\('users'/g, "listRecords('users'");

// 3. repository.ts
// Fix createLedgerRecord signature to accept `silent?: boolean`
replaceInFile('lib/repository.ts', /export async function createLedgerRecord<K extends keyof EntityMap>\(\n  collectionName: K,\n  data: Omit<EntityMap\[K\], 'id' \| keyof AuditFields> & Partial<AuditFields>,\n  user: GuildUser,\n  actionMessage: string\n\)/g, 
`export async function createLedgerRecord<K extends keyof EntityMap>(
  collectionName: K,
  data: Omit<EntityMap[K], 'id' | keyof AuditFields> & Partial<AuditFields>,
  user: GuildUser,
  actionMessage: string,
  silent?: boolean
)`);
// Fix cast error in repository.ts
replaceInFile('lib/repository.ts', /as EntityMap\[K\];/g, "as unknown as EntityMap[K];");

// 4. Fix imports in CreateForms (needs, opportunities, organizations)
replaceInFile('pages/needs/NeedCreateForm.tsx', /\.\.\/\.\.\/\.\.\//g, "../../");
replaceInFile('pages/opportunities/OpportunityCreateForm.tsx', /\.\.\/\.\.\/\.\.\//g, "../../");
replaceInFile('pages/opportunities/OpportunityCreateForm.tsx', /s\.trim\(\)/g, "(s: string) => s.trim()"); // fix implicit any
replaceInFile('pages/organizations/OrganizationCreateForm.tsx', /\.\.\/\.\.\/\.\.\//g, "../../");

// 5. workflowService.ts -> fix category missing
replaceInFile('services/workflowService.ts', /organizationName: need\.organizationName,/g, "organizationName: need.organizationName,\n    category: opportunityData.category || 'General',");
replaceInFile('services/workflowService.ts', /organizationId: opportunity\.organizationId,/g, "organizationId: opportunity.organizationId,\n    category: questData.category || opportunity.category || 'General',");
replaceInFile('services/workflowService.ts', /listRecords<Quest>\('quests'/g, "listRecords('quests'");

// 6. Fix `env` in firebase.ts by adding it to tsconfig.json
const tsconfigPath = path.join(basePath, '../tsconfig.json');
let tsconfig = fs.readFileSync(tsconfigPath, 'utf8');
if (!tsconfig.includes('"types": ["vite/client"]')) {
  tsconfig = tsconfig.replace('"compilerOptions": {', '"compilerOptions": {\n    "types": ["vite/client"],');
  fs.writeFileSync(tsconfigPath, tsconfig);
}

// 7. Fix MemberSearch.tsx state implicit any for Dispatch
replaceInFile('components/MemberSearch.tsx', /const \[results, setResults\] = useState<GuildUser\[\]>\(\[\]\);/g, "const [results, setResults] = useState<any[]>([]);");
// Wait, better to just let implicit generic work or use any.

