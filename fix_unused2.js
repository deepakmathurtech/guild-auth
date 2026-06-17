import fs from 'fs';

const fixes = [
  { file: 'simulate.ts', match: /import \{ getFirestore.*\}\n/g, replace: "import { getFirestore } from 'firebase/firestore';\n" },
  { file: 'simulate.ts', match: /const db = getFirestore\(app\);\n/g, replace: "" },
  { file: 'src/components/AppShell.tsx', match: /import \{ Menu \} from 'lucide-react';\n/g, replace: "" },
  { file: 'src/components/dashboards/AdminDashboard.tsx', match: /import \{ useAuth \} from '\.\.\/\.\.\/context\/AuthContext';\n/g, replace: "" },
  { file: 'src/components/dashboards/ManagerDashboard.tsx', match: /import \{ useAuth \} from '\.\.\/\.\.\/context\/AuthContext';\n/g, replace: "" },
  { file: 'src/components/dashboards/ReceptionistDashboard.tsx', match: /import \{ useAuth \} from '\.\.\/\.\.\/context\/AuthContext';\n/g, replace: "" },
  { file: 'src/pages/opportunities/OpportunityDetailsPage.tsx', match: /import \{ Quest \} from '\.\.\/\.\.\/types\/guild';\n/g, replace: "" },
  { file: 'src/pages/opportunities/OpportunityDetailsPage.tsx', match: /GuildUser, /, replace: "" },
  { file: 'src/pages/opportunities/OpportunityDetailsPage.tsx', match: /where, /, replace: "" },
  { file: 'src/pages/opportunities/OpportunityDetailsPage.tsx', match: /import \{ where \} from 'firebase\/firestore';\n/g, replace: "" },
];

fixes.forEach(({file, match, replace}) => {
  const p = `c:/Users/pc/Desktop/guild-web/guild-auth/${file}`;
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(match, replace);
    fs.writeFileSync(p, content);
  }
});
