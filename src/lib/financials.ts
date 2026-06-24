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
 */
export function calculateGuildShare(
  grossAmount: number,
  guildPercentage: number = DEFAULT_GUILD_PERCENTAGE
): GuildShareResult {
  // Ensure minimum 5% guild share
  const safePercentage = Math.max(guildPercentage, 5);
  const baseGuildAmount = Math.round(grossAmount * (safePercentage / 100));
  const baseMemberAmount = grossAmount - baseGuildAmount;

  // Round member payout down to psychological price
  const roundedMemberRevenue = roundToPreferredEnding(baseMemberAmount);

  // Rounding adjustment goes to guild
  const roundingAdjustment = baseMemberAmount - roundedMemberRevenue;
  const finalGuildRevenue = baseGuildAmount + roundingAdjustment;

  return {
    grossAmount,
    guildRevenue: finalGuildRevenue,
    memberRevenue: roundedMemberRevenue,
    baseGuildPercentage: safePercentage,
    baseGuildAmount,
    roundingAdjustment,
    finalDistribution: {
      guild: finalGuildRevenue,
      member: roundedMemberRevenue
    }
  };
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