import fs from 'fs';

const fixes = [
  { file: 'src/components/AppShell.tsx', match: /Bell, /, replace: '' },
  { file: 'src/components/AppShell.tsx', match: /, Search/, replace: '' },
  { file: 'src/components/AppShell.tsx', match: /Menu, /, replace: '' },
  { file: 'src/components/NetworkIndicator.tsx', match: /, Wifi/, replace: '' },
  { file: 'src/components/dashboards/AdminDashboard.tsx', match: /const \{ profile \} = useAuth\(\);/, replace: '' },
  { file: 'src/components/dashboards/AdminDashboard.tsx', match: /metrics, /, replace: '' },
  { file: 'src/components/dashboards/ManagerDashboard.tsx', match: /ActivityLog, Need, /, replace: '' },
  { file: 'src/components/dashboards/ManagerDashboard.tsx', match: /, RevenueEvent/, replace: '' },
  { file: 'src/components/dashboards/ManagerDashboard.tsx', match: /const \{ profile \} = useAuth\(\);/, replace: '' },
  { file: 'src/components/dashboards/ManagerDashboard.tsx', match: /metrics, organizations, verifications, /, replace: '' },
  { file: 'src/components/dashboards/MemberDashboard.tsx', match: /DashboardMetric, /, replace: '' },
  { file: 'src/components/dashboards/MemberDashboard.tsx', match: /, revenue/, replace: '' },
  { file: 'src/components/dashboards/ReceptionistDashboard.tsx', match: /DashboardMetric, /, replace: '' },
  { file: 'src/components/dashboards/ReceptionistDashboard.tsx', match: /const \{ profile \} = useAuth\(\);/, replace: '' },
  { file: 'src/pages/WorkbenchPage.tsx', match: /LedgerCollection, /, replace: '' },
  { file: 'src/pages/WorkbenchPage.tsx', match: /, VerificationMethod/, replace: '' },
  { file: 'src/pages/opportunities/OpportunityDetailsPage.tsx', match: /, subscribeRecords/, replace: '' },
  { file: 'src/pages/opportunities/OpportunityDetailsPage.tsx', match: /GuildUser, /, replace: '' },
  { file: 'src/pages/opportunities/OpportunityDetailsPage.tsx', match: /where, /, replace: '' },
  { file: 'src/pages/opportunities/OpportunityDetailsPage.tsx', match: /const \[quests, setQuests\] = useState<Quest\[\]>\(\[\]\);/, replace: '' },
  { file: 'src/services/workflowService.ts', match: /, writeBatch/, replace: '' },
  { file: 'simulate.ts', match: /collection, addDoc, getDocs/, replace: '' },
];

fixes.forEach(({file, match, replace}) => {
  const p = `c:/Users/pc/Desktop/guild-web/guild-auth/${file}`;
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(match, replace);
    fs.writeFileSync(p, content);
  }
});
