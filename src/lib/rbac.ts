import type { GuildRole } from '../types/guild';

export const roleWeight: Record<GuildRole, number> = {
  applicant: 0,
  member: 1,
  contributor: 2,
  receptionist: 3,
  cityGuildMaster: 4,
  stateGuildMaster: 5,
  centralGuildMaster: 6,
  guildFounder: 7
};

export function hasRole(userRole: GuildRole | undefined, allowed: GuildRole[]) {
  if (!userRole) return false;
  return allowed.includes(userRole) || userRole === 'guildFounder';
}

export function atLeast(userRole: GuildRole | undefined, minimum: GuildRole) {
  if (!userRole) return false;
  return roleWeight[userRole] >= roleWeight[minimum];
}

export const roleLabels: Record<GuildRole, string> = {
  applicant: 'Applicant',
  member: 'Member',
  contributor: 'Contributor',
  receptionist: 'Receptionist',
  cityGuildMaster: 'City Guild Master',
  stateGuildMaster: 'State Guild Master',
  centralGuildMaster: 'Central Guild Master',
  guildFounder: 'Guild Founder'
};
