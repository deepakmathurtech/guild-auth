/**
 * financials.ts - Guild Financial Calculations
 *
 * Handles guild revenue share calculations with psychological payout rounding.
 * Default: Guild = 5%, Member = remaining
 */

/** Preferred endings for member payout (rounding down) */
const PREFERRED_ENDINGS = [99, 49, 39, 29, 19];

/** Default guild percentage */
const DEFAULT_GUILD_PERCENTAGE = 5;

/**
 * Round member payout to preferred ending
 * Rounds DOWN to create psychological pricing
 */
function roundToPreferredEnding(amount: number): number {
  const lastTwoDigits = amount % 100;

  // Find the closest preferred ending that is <= current amount
  let closestEnding = PREFERRED_ENDINGS[0];
  for (const ending of PREFERRED_ENDINGS) {
    if (ending <= lastTwoDigits) {
      closestEnding = ending;
    }
  }

  // If no preferred ending found in the range, use 99
  if (lastTwoDigits < PREFERRED_ENDINGS[0]) {
    closestEnding = PREFERRED_ENDINGS[0];
  }

  return Math.floor(amount / 100) * 100 + closestEnding;
}

/**
 * Calculate guild revenue share with rounding
 */
export interface GuildShareResult {
  grossAmount: number;
  guildRevenue: number;
  memberRevenue: number;
  baseGuildPercentage: number;
  baseGuildAmount: number;
  roundingAdjustment: number;
  finalDistribution: {
    guild: number;
    member: number;
  };
}

/**
 * Calculate how revenue should be split between guild and member
 * Guarante Minimum 5% guild share
 */
export function calculateGuildShare(
  grossAmount: number,
  guildPercentage: number = DEFAULT_GUILD_PERCENTAGE
): GuildShareResult {
  // Ensure minimum 5% guild share
  const safePercentage = Math.max(guildPercentage, 5);
  const minGuildAmount = Math.ceil(grossAmount * (safePercentage / 100)); // ceil to ensure minimum 5%
  const memberBeforeRounding = grossAmount - minGuildAmount;

  // Round member payout DOWN to preferred ending (floor)
  const roundedMemberRevenue = roundToPreferredEndingFloor(memberBeforeRounding);

  // Rounding goes to guild
  const roundingDrop = memberBeforeRounding - roundedMemberRevenue;
  let finalGuildRevenue = minGuildAmount + roundingDrop;
  let finalMemberRevenue = roundedMemberRevenue;

  // Safety: ensure guild >= 5% (this handles edge cases with small amounts)
  const minRequired = Math.ceil(grossAmount * 0.05);
  if (finalGuildRevenue < minRequired) {
    finalGuildRevenue = minRequired;
    finalMemberRevenue = grossAmount - finalGuildRevenue;
  }

  return {
    grossAmount,
    guildRevenue: finalGuildRevenue,
    memberRevenue: finalMemberRevenue,
    baseGuildPercentage: safePercentage,
    baseGuildAmount: minGuildAmount,
    roundingAdjustment: roundingDrop,
    finalDistribution: {
      guild: finalGuildRevenue,
      member: finalMemberRevenue
    }
  };
}

/**
 * Round DOWN to preferred ending (floor, not nearest)
 * Finds the highest ending <= lastTwoDigits from descending PREFERRED_ENDINGS list
 */
function roundToPreferredEndingFloor(amount: number): number {
  const lastTwoDigits = amount % 100;

  // PREFERRED_ENDINGS is descending: [99, 49, 39, 29, 19]
  // Round DOWN: find the highest ending <= lastTwoDigits
  let selected = 0;
  for (const ending of PREFERRED_ENDINGS) {
    if (ending <= lastTwoDigits) {
      selected = ending;
      break; // First match is highest since list is descending
    }
  }

  // If no ending found (lastTwoDigits < 19), round down to nearest 100
  if (selected === 0) {
    return Math.floor(amount / 100) * 100;
  }

  return Math.floor(amount / 100) * 100 + selected;
}

/**
 * Calculate payout for a paid quest (alias for backwards compatibility)
 */
export function calculateQuestPayout(
  paymentAmount: number,
  guildPercentage: number = DEFAULT_GUILD_PERCENTAGE
): GuildShareResult {
  return calculateGuildShare(paymentAmount, guildPercentage);
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR'
): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Check if payment is still pending for a quest
 */
export function isPaymentPending(quest: { isPaid?: boolean; paymentStatus?: string }): boolean {
  return quest.isPaid === true && quest.paymentStatus !== 'Paid';
}