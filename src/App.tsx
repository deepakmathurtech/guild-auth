import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkbenchPage } from './pages/WorkbenchPage';

import { OrganizationListPage } from './pages/organizations/OrganizationListPage';
import { OrganizationDetailsPage } from './pages/organizations/OrganizationDetailsPage';
import { NeedListPage } from './pages/needs/NeedListPage';
import { NeedDetailsPage } from './pages/needs/NeedDetailsPage';
import { OpportunityListPage } from './pages/opportunities/OpportunityListPage';
import { OpportunityDetailsPage } from './pages/opportunities/OpportunityDetailsPage';
import { QuestListPage } from './pages/quests/QuestListPage';
import { QuestRegistrationWizard } from './pages/quests/QuestRegistrationWizard';
import { QuestDetailsPage } from './pages/quests/QuestDetailsPage';
import { SubmissionQueuePage } from './pages/submissions/SubmissionQueuePage';
import { SubmissionReviewPage } from './pages/submissions/SubmissionReviewPage';
import { OutcomePage } from './pages/outcomes/OutcomePage';
import type { GuildRole } from './types/guild';

import './styles.css';

const savedTheme = localStorage.getItem('guild-theme');
document.documentElement.dataset.theme = savedTheme || 'light';

const allActiveRoles: GuildRole[] = [
  'applicant',
  'member',
  'contributor',
  'receptionistCandidate',
  'receptionist',
  'cityGuildMaster',
  'stateGuildMaster',
  'centralGuildMaster',
  'nationalGuildMaster',
  'guildFounder',
  'founder'
];

const memberRoles: GuildRole[] = [
  'member',
  'contributor',
  'receptionistCandidate',
  'receptionist',
  'cityGuildMaster',
  'stateGuildMaster',
  'centralGuildMaster',
  'nationalGuildMaster',
  'guildFounder',
  'founder'
];

const receptionistRoles: GuildRole[] = [
  'receptionist',
  'cityGuildMaster',
  'stateGuildMaster',
  'centralGuildMaster',
  'nationalGuildMaster',
  'guildFounder',
  'founder'
];

const cityLeadershipRoles: GuildRole[] = [
  'cityGuildMaster',
  'stateGuildMaster',
  'centralGuildMaster',
  'nationalGuildMaster',
  'guildFounder',
  'founder'
];

const centralAdminRoles: GuildRole[] = [
  'centralGuildMaster',
  'nationalGuildMaster',
  'guildFounder',
  'founder'
];

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute roles={allActiveRoles} />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          
          {
            element: <ProtectedRoute roles={receptionistRoles} />,
            children: [
              { path: 'organizations', element: <OrganizationListPage /> },
              { path: 'organizations/:id', element: <OrganizationDetailsPage /> },
              { path: 'needs', element: <NeedListPage /> },
              { path: 'needs/:id', element: <NeedDetailsPage /> },
              { path: 'quests/register', element: <QuestRegistrationWizard /> },
              { path: 'submissions', element: <SubmissionQueuePage /> },
              { path: 'submissions/:id', element: <SubmissionReviewPage /> },
              { path: 'outcomes', element: <OutcomePage /> },
              { path: 'verification', element: <WorkbenchPage kind="verification" /> },
              { path: 'revenue', element: <WorkbenchPage kind="revenue" /> }
            ]
          },
          
          {
            element: <ProtectedRoute roles={memberRoles} />,
            children: [
              { path: 'opportunities', element: <OpportunityListPage /> },
              { path: 'opportunities/:id', element: <OpportunityDetailsPage /> },
              { path: 'quests', element: <QuestListPage /> },
              { path: 'quests/:id', element: <QuestDetailsPage /> },
              { path: 'knowledge', element: <WorkbenchPage kind="knowledge" /> }
            ]
          },

          {
            element: <ProtectedRoute roles={cityLeadershipRoles} />,
            children: [
              { path: 'ledger', element: <WorkbenchPage kind="ledger" /> }
            ]
          },

          {
            element: <ProtectedRoute roles={centralAdminRoles} />,
            children: [
              { path: 'admin', element: <WorkbenchPage kind="admin" /> }
            ]
          }
        ]
      }
    ]
  }
]);

export default function App() {
  return <AuthProvider><RouterProvider router={router} /></AuthProvider>;
}
