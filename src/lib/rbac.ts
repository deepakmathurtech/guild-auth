import type { GuildRole, GuildUser } from '../types/guild';

export const roleWeight: Record<GuildRole, number> = {
  applicant: 0,
  member: 1,
  contributor: 2,
  receptionistCandidate: 2.5,
  receptionist: 3,
  cityGuildMaster: 4,
  stateGuildMaster: 5,
  centralGuildMaster: 6,
  nationalGuildMaster: 6,
  guildFounder: 7,
  founder: 7,
  organizationRepresentative: 1  // PHASE 1: Same as member - converted role
};

export function hasRole(userRole: GuildRole | undefined, allowed: GuildRole[]) {
  if (!userRole) return false;
  return allowed.includes(userRole) || userRole === 'guildFounder' || userRole === 'founder';
}

export function atLeast(userRole: GuildRole | undefined, minimum: GuildRole) {
  if (!userRole) return false;
  return roleWeight[userRole] >= roleWeight[minimum];
}

export function isUserActive(user: GuildUser | null | undefined): boolean {
  if (!user) return false;
  return user.status === 'active';
}

export const roleLabels: Record<GuildRole, string> = {
  applicant: 'Applicant',
  member: 'Member',
  contributor: 'Contributor',
  receptionistCandidate: 'Receptionist Candidate',
  receptionist: 'Receptionist',
  cityGuildMaster: 'City Guild Master',
  stateGuildMaster: 'State Guild Master',
  centralGuildMaster: 'Central Guild Master',
  nationalGuildMaster: 'National Guild Master',
  guildFounder: 'Guild Founder',
  founder: 'Founder',
  organizationRepresentative: 'Organization Representative'  // PHASE 1
};
