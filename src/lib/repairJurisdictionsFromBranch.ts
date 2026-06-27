import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

import { db } from './firebase';
import type { GuildUser, Branch } from '../types/guild';

const STAFF_ROLES_BRANCH_BASED = ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster'] as const;

function isUnknownLocationField(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return v === '' || v.toLowerCase() === 'unknown' || v.toLowerCase() === 'n/a';
}

async function getBranchById(branchId: string): Promise<Branch | null> {
  const snap = await getDoc(doc(db, 'guildBranches', branchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Branch;
}

/**
 * Idempotent repair: for staff users with a branchId, backfill jurisdiction and branchName
 * only when jurisdiction fields are missing or Unknown.
 */
export async function repairStaffJurisdictionsFromBranch(opts?: { dryRun?: boolean; batchSize?: number }): Promise<{ scanned: number; updated: number }> {
  const dryRun = !!opts?.dryRun;
  const batchSize = opts?.batchSize ?? 350; // stay below Firestore batch limits

  const roles = [...STAFF_ROLES_BRANCH_BASED];

  const q = query(
    collection(db, 'users'),
    where('archiveStatus', '==', 'active'),
    where('role', 'in', roles)
  );

  const snap = await getDocs(q);

  let scanned = 0;
  let updated = 0;
  let batch = writeBatch(db);
  let batchOps = 0;

  for (const d of snap.docs) {
    const user = { uid: d.id, ...(d.data() as any) } as GuildUser;
    scanned++;

    if (!user.branchId) continue;

    const cj = user.jurisdiction;
    const shouldRepairCity = isUnknownLocationField(cj?.cityName) || isUnknownLocationField(cj?.cityId);
    const shouldRepairState = isUnknownLocationField(cj?.stateName) || isUnknownLocationField(cj?.stateId);
    const shouldRepairCountry = isUnknownLocationField(cj?.countryName) || isUnknownLocationField(cj?.countryId);
    const shouldRepairBranchName = isUnknownLocationField(user.branchName);

    if (!shouldRepairCity && !shouldRepairState && !shouldRepairCountry && !shouldRepairBranchName) {
      continue;
    }

    const branch = await getBranchById(user.branchId);
    if (!branch) continue;

    const patch: Partial<GuildUser> = {
      branchName: shouldRepairBranchName || shouldRepairCity || shouldRepairState || shouldRepairCountry
        ? branch.name
        : user.branchName,
      jurisdiction: {
        // Always write defined values (never undefined) to satisfy Firestore
        cityId: shouldRepairCity ? branch.cityId : (cj?.cityId ?? branch.cityId),
        cityName: shouldRepairCity ? branch.cityName : (cj?.cityName ?? branch.cityName),
        stateId: shouldRepairState ? branch.stateId : (cj?.stateId ?? branch.stateId),
        stateName: shouldRepairState ? branch.stateName : (cj?.stateName ?? branch.stateName),
        countryId: shouldRepairCountry ? branch.countryId : (cj?.countryId ?? branch.countryId),
        countryName: shouldRepairCountry ? branch.countryName : (cj?.countryName ?? branch.countryName)
      },
      updatedAt: serverTimestamp() as any
    };


    if (dryRun) continue;

    batch.update(doc(db, 'users', user.uid), patch as any);
    batchOps++;
    updated++;

    if (batchOps >= batchSize) {
      await batch.commit();
      batch = writeBatch(db);
      batchOps = 0;
    }
  }

  if (!dryRun && batchOps > 0) {
    await batch.commit();
  }

  return { scanned, updated };
}

