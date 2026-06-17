import type { GuildRole } from '../types/guild';

export const roleWeight: Record<GuildRole, number> = {
  member: 1,
  contributor: 2,
  receptionist: 3,
  guildManager: 4,
  guildAdmin: 5
};

export function hasRole(userRole: GuildRole | undefined, allowed: GuildRole[]) {
  if (!userRole) return false;
  return allowed.includes(userRole) || userRole === 'guildAdmin';
}

export function atLeast(userRole: GuildRole | undefined, minimum: GuildRole) {
  if (!userRole) return false;
  return roleWeight[userRole] >= roleWeight[minimum];
}

export const roleLabels: Record<GuildRole, string> = {
  member: 'Member',
  contributor: 'Contributor',
  receptionist: 'Receptionist',
  guildManager: 'Guild Manager',
  guildAdmin: 'Guild Admin'
};
