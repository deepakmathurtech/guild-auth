import { db } from '../lib/firebase';
import {
  collection, query, where, getDocs, doc, updateDoc,
  addDoc, serverTimestamp, orderBy, limit
} from 'firebase/firestore';
import type { Branch, BranchRequest, Jurisdiction, Organization, GuildUser } from '../types/guild';

// PHASE 1: Branch lookup - find existing branch by jurisdiction
export async function findBranchByJurisdiction(jurisdiction: Jurisdiction): Promise<Branch | null> {
  const q = query(
    collection(db, 'guildBranches'),
    where('cityId', '==', jurisdiction.cityId),
    where('status', '==', 'active'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Branch;
}

// PHASE 1: Find all branches in a state
export async function findBranchesByState(stateId: string): Promise<Branch[]> {
  const q = query(
    collection(db, 'guildBranches'),
    where('stateId', '==', stateId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Branch[];
}

// PHASE 1: Find all branches in a country
export async function findBranchesByCountry(countryId: string): Promise<Branch[]> {
  const q = query(
    collection(db, 'guildBranches'),
    where('countryId', '==', countryId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Branch[];
}

// PHASE 1: Get all branches (any status)
export async function getAllBranches(): Promise<Branch[]> {
  const q = query(collection(db, 'guildBranches'));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.map(d => normalizeBranch(d as any)) as Branch[];
}

// Normalize branch data to Branch interface
function normalizeBranch(data: any): Branch {
  const stateId = data.stateId || data.state?.toLowerCase().replace(/\s+/g, '-') || '';
  const stateName = data.stateName || data.state || '';
  const cityId = data.cityId || data.city?.toLowerCase().replace(/\s+/g, '-') || '';
  const cityName = data.cityName || data.city || '';
  const countryId = data.countryId || data.country?.toLowerCase().replace(/\s+/g, '-') || 'india';
  const countryName = data.countryName || data.country || 'India';

  return {
    id: data.id,
    name: data.name || '',
    code: data.code || '',
    cityId,
    cityName,
    stateId,
    stateName,
    countryId,
    countryName,
    status: data.status || 'inactive',
    assignedGuildMasterId: data.assignedGuildMasterId,
    assignedGuildMasterName: data.localHubCoordinator?.name || data.assignedGuildMasterName,
    assignedReceptionistId: data.assignedReceptionistId,
    assignedReceptionistName: data.assignedReceptionistName,
    memberCount: data.memberCount || data.statistics?.activeMembers || 0,
    organizationCount: data.organizationCount || 0,
    receptionistCount: data.receptionistCount || 0,
    reputationScore: data.reputationScore || data.statistics?.trustScore || 0,
    jurisdiction: { cityId, cityName, stateId, stateName, countryId, countryName },
    createdBy: data.createdBy || data.localHubCoordinator?.role || 'system',
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    archiveStatus: data.archiveStatus || 'active'
  };
}

// PHASE 2: Branch request creation
export async function createBranchRequest(
  jurisdiction: Jurisdiction,
  requestedByUserId?: string,
  requestedByOrganizationId?: string,
  notes?: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'branchRequests'), {
    ...jurisdiction,
    requestedByUserId,
    requestedByOrganizationId,
    requestedCity: jurisdiction.cityName,
    requestedState: jurisdiction.stateName,
    requestedCountry: jurisdiction.countryName,
    status: 'pending',
    archiveStatus: 'active',
    createdBy: requestedByUserId || 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes
  });
  return ref.id;
}

// PHASE 2: Get pending branch requests
export async function getPendingBranchRequests(): Promise<BranchRequest[]> {
  const q = query(
    collection(db, 'branchRequests'),
    where('status', '==', 'pending'),
    where('archiveStatus', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as BranchRequest[];
}

// PHASE 4: Approve branch request and create branch
// PHASE 5: Auto-assign pending users/organizations after branch creation
export async function approveBranchRequest(
  requestId: string,
  branchName: string,
  branchCode: string,
  assignedGuildMasterId?: string,
  assignedReceptionistId?: string,
  resolvedBy?: string
): Promise<{ branchId: string; usersAssigned: number; organizationsAssigned: number }> {
  const requestRef = doc(db, 'branchRequests', requestId);
  // Get the request - fetch all and filter in memory
  const q = query(collection(db, 'branchRequests'), where('status', '==', 'pending'));
  const requestSnap = await getDocs(q);
  if (requestSnap.empty) throw new Error('Branch request not found');

  const requestDoc = requestSnap.docs.find(d => d.id === requestId);
  if (!requestDoc) throw new Error('Branch request not found');
  const request = requestDoc.data() as BranchRequest;

  // Create the branch
  const branchRef = await addDoc(collection(db, 'guildBranches'), {
    name: branchName,
    code: branchCode,
    cityId: request.requestedCity?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
    cityName: request.requestedCity || 'Unknown',
    stateId: request.requestedState?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
    stateName: request.requestedState || 'Unknown',
    countryId: request.requestedCountry?.toLowerCase().replace(/\s+/g, '-') || 'india',
    countryName: request.requestedCountry || 'India',
    status: 'active',
    assignedGuildMasterId,
    assignedReceptionistId,
    memberCount: 0,
    organizationCount: 0,
    archiveStatus: 'active',
    createdBy: resolvedBy || 'founder',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // PHASE 5: Auto-assign users and organizations in this jurisdiction
  const cityId = request.requestedCity?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  let usersAssigned = 0;
  let organizationsAssigned = 0;

  try {
    // Find users without branches in this city
    const usersWithoutBranch = await findUsersWithoutBranch();
    const matchingUsers = usersWithoutBranch.filter(u =>
      u.jurisdiction?.cityId === cityId ||
      u.jurisdiction?.cityName?.toLowerCase().replace(/\s+/g, '-') === cityId
    );

    if (matchingUsers.length > 0) {
      const userIds = matchingUsers.map(u => u.uid);
      await assignUsersToBranch(branchRef.id, userIds);
      usersAssigned = userIds.length;
    }
  } catch (err) {
    console.error('Failed to assign users:', err);
  }

  try {
    // Find organizations without branches in this city
    const orgsWithoutBranch = await findOrganizationsWithoutBranch();
    const matchingOrgs = orgsWithoutBranch.filter(o =>
      o.city?.toLowerCase().replace(/\s+/g, '-') === cityId
    );

    if (matchingOrgs.length > 0) {
      const orgIds = matchingOrgs.map(o => o.id);
      await assignOrganizationsToBranch(branchRef.id, orgIds);
      organizationsAssigned = orgIds.length;
    }
  } catch (err) {
    console.error('Failed to assign organizations:', err);
  }

  // Update the request as approved
  await updateDoc(requestRef, {
    status: 'approved',
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    branchId: branchRef.id
  });

  return { branchId: branchRef.id, usersAssigned, organizationsAssigned };
}

// PHASE 4: Reject branch request
export async function rejectBranchRequest(
  requestId: string,
  resolvedBy?: string,
  notes?: string
): Promise<void> {
  const requestRef = doc(db, 'branchRequests', requestId);
  await updateDoc(requestRef, {
    status: 'rejected',
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    notes
  });
}

// PHASE 5: Create a new branch directly (Founder action)
export async function createBranch(
  name: string,
  code: string,
  jurisdiction: Jurisdiction,
  assignedGuildMasterId?: string,
  assignedReceptionistId?: string,
  createdBy?: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'guildBranches'), {
    name,
    code,
    cityId: jurisdiction.cityId,
    cityName: jurisdiction.cityName,
    stateId: jurisdiction.stateId,
    stateName: jurisdiction.stateName,
    countryId: jurisdiction.countryId,
    countryName: jurisdiction.countryName,
    status: 'active',
    assignedGuildMasterId,
    assignedReceptionistId,
    memberCount: 0,
    organizationCount: 0,
    archiveStatus: 'active',
    createdBy: createdBy || 'founder',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return ref.id;
}

// PHASE 5: Assign users to a newly created branch
export async function assignUsersToBranch(branchId: string, userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      branchId,
      updatedAt: new Date().toISOString()
    });
  }
}

// PHASE 5: Assign organizations to a newly created branch
export async function assignOrganizationsToBranch(branchId: string, orgIds: string[]): Promise<void> {
  for (const orgId of orgIds) {
    const orgRef = doc(db, 'organizations', orgId);
    await updateDoc(orgRef, {
      branchId,
      updatedAt: new Date().toISOString()
    });
  }
}

// PHASE 10: Data integrity - find users without branch
export async function findUsersWithoutBranch(): Promise<GuildUser[]> {
  const q = query(collection(db, 'users'), where('archiveStatus', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() } as GuildUser))
    .filter(u => !u.branchId);
}

// PHASE 10: Data integrity - find organizations without branch
export async function findOrganizationsWithoutBranch(): Promise<Organization[]> {
  const q = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Organization))
    .filter(o => !o.branchId);
}

// PHASE 10: Data integrity - find receptionists/guild masters without branch
export async function findStaffWithoutBranch(): Promise<GuildUser[]> {
  const q = query(
    collection(db, 'users'),
    where('archiveStatus', '==', 'active'),
    where('role', 'in', ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster'])
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() } as GuildUser))
    .filter(u => !u.branchId);
}

// PHASE 11: Find least-loaded receptionist for load balancing
export async function findLeastLoadedReceptionist(cityId?: string, stateId?: string): Promise<GuildUser | null> {
  // Fetch potential receptionists
  const conditions = [
    where('archiveStatus', '==', 'active'),
    where('role', '==', 'receptionist')
  ];
  if (cityId) conditions.push(where('jurisdiction.cityId', '==', cityId));
  if (stateId && !cityId) conditions.push(where('jurisdiction.stateId', '==', stateId));

  const q = query(collection(db, 'users'), ...conditions);
  const snap = await getDocs(q);
  const receptionists = snap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser));

  if (receptionists.length === 0) return null;

  // Simple load balancing: return first available
  // Future: query quest counts and sort by least loaded
  return receptionists[0];
}

// PHASE 10: Update branch member counts
export async function updateBranchMemberCounts(): Promise<void> {
  const branches = await getAllBranches();
  for (const branch of branches) {
    const branchRef = doc(db, 'branches', branch.id);
    await updateDoc(branchRef, {
      memberCount: branch.memberCount || 0,
      organizationCount: branch.organizationCount || 0,
      updatedAt: new Date().toISOString()
    });
  }
}

// ========== HIERARCHICAL VIEW METHODS ==========

export interface StateGroup {
  stateId: string;
  stateName: string;
  countryId: string;
  countryName: string;
  branches: Branch[];
  totalMembers: number;
  totalOrganizations: number;
  totalReceptionists: number;
}

// Get branches grouped by state for hierarchical view
export async function getBranchesGroupedByState(): Promise<StateGroup[]> {
  const branches = await getAllBranches();

  // Group by stateId
  const stateMap = new Map<string, StateGroup>();

  for (const branch of branches) {
    // Handle both naming conventions: stateId/stateName or state/city
    const stateId = (branch as any).state?.toLowerCase().replace(/\s+/g, '-') || branch.stateId || 'unknown';
    const stateName = (branch as any).state || branch.stateName || 'Unknown';
    const countryId = (branch as any).country?.toLowerCase().replace(/\s+/g, '-') || branch.countryId || 'india';
    const countryName = (branch as any).country || branch.countryName || 'India';

    if (!stateMap.has(stateId)) {
      stateMap.set(stateId, {
        stateId,
        stateName,
        countryId,
        countryName,
        branches: [],
        totalMembers: 0,
        totalOrganizations: 0,
        totalReceptionists: 0
      });
    }

    const group = stateMap.get(stateId)!;
    group.branches.push(branch);
    group.totalMembers += branch.memberCount || 0;
    group.totalOrganizations += branch.organizationCount || 0;
    group.totalReceptionists += branch.receptionistCount || 0;
  }

  return Array.from(stateMap.values()).sort((a, b) => a.stateName.localeCompare(b.stateName));
}

// Get entities for a specific branch (members, organizations, receptionists)
export interface BranchEntities {
  members: GuildUser[];
  organizations: Organization[];
  receptionists: GuildUser[];
}

export async function getBranchEntities(branchId: string): Promise<BranchEntities> {
  // Get all users and filter in memory (Firestore limitation)
  const usersQ = query(collection(db, 'users'), where('archiveStatus', '==', 'active'));
  const usersSnap = await getDocs(usersQ);
  const allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser));

  // Filter members (non-staff roles)
  const memberRoles = ['member', 'applicant', 'organizationRepresentative'];
  const members = allUsers.filter(u => u.branchId === branchId && memberRoles.includes(u.role || ''));

  // Filter receptionists
  const receptionists = allUsers.filter(u => u.branchId === branchId && u.role === 'receptionist');

  // Get all organizations and filter in memory
  const orgsQ = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'));
  const orgsSnap = await getDocs(orgsQ);
  const organizations = orgsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Organization))
    .filter(o => o.branchId === branchId);

  return { members, organizations, receptionists };
}

// Full sync: Update all branch entity counts from database
export async function syncAllBranchCounts(): Promise<{ branchesUpdated: number }> {
  const branches = await getAllBranches();
  let branchesUpdated = 0;

  for (const branch of branches) {
    const entities = await getBranchEntities(branch.id);

    const branchRef = doc(db, 'branches', branch.id);
    await updateDoc(branchRef, {
      memberCount: entities.members.length,
      organizationCount: entities.organizations.length,
      receptionistCount: entities.receptionists.length,
      updatedAt: new Date().toISOString()
    });

    branchesUpdated++;
  }

  return { branchesUpdated };
}

// Get state report (all cities in a state with their counts)
export interface StateReport {
  stateId: string;
  stateName: string;
  countryId: string;
  countryName: string;
  cityBranches: Array<{
    branch: Branch;
    memberCount: number;
    organizationCount: number;
    receptionistCount: number;
  }>;
  totals: {
    members: number;
    organizations: number;
    receptionists: number;
  };
}

export async function getStateReport(stateId: string): Promise<StateReport | null> {
  const branches = await getAllBranches();
  const stateBranches = branches.filter(b => b.stateId === stateId);

  if (stateBranches.length === 0) return null;

  const firstBranch = stateBranches[0];
  const cityBranches: StateReport['cityBranches'] = [];
  let totals = { members: 0, organizations: 0, receptionists: 0 };

  for (const branch of stateBranches) {
    const entities = await getBranchEntities(branch.id);
    cityBranches.push({
      branch,
      memberCount: entities.members.length,
      organizationCount: entities.organizations.length,
      receptionistCount: entities.receptionists.length
    });
    totals.members += entities.members.length;
    totals.organizations += entities.organizations.length;
    totals.receptionists += entities.receptionists.length;
  }

  return {
    stateId: firstBranch.stateId || 'unknown',
    stateName: firstBranch.stateName || 'Unknown',
    countryId: firstBranch.countryId || 'india',
    countryName: firstBranch.countryName || 'India',
    cityBranches,
    totals
  };
}