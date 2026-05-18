import { Hedgerow, getEFACount } from './hedgerows';

export interface AESEnrollment {
  id: string;
  schemeId: string;
  enrolledDay: number;
  enrolledParcels: string[];
  enrolledHa: number;
  endDay: number;
  totalPaidSoFar: number;
  status: 'active' | 'violated' | 'completed';
}

export interface SubsidyPayment {
  day: number;
  basic: number;
  greening: number;
  youngFarmer: number;
  aes: number;
  total: number;
  greeningQualified: boolean;
  greeningFailReasons: string[];
}

export const AES_SCHEMES = [
  { id: 'aes_cover', name: 'Cover Crop Scheme', paymentPerHa: 60, obligation: 'Plant cover crops on enrolled parcels every winter' },
  { id: 'aes_wetland', name: 'Wetland Maintenance', paymentPerHa: 120, obligation: 'Do not cultivate or drain flagged wet parcels' },
  { id: 'aes_corridor', name: 'Wildlife Corridor', paymentPerHa: 80, obligation: 'Maintain hedgerows, no herbicide within 3m of hedge' },
  { id: 'aes_lowpest', name: 'Reduced Pesticide', paymentPerHa: 90, obligation: 'No synthetic pesticides on enrolled parcels' },
] as const;

export type AESSchemeId = typeof AES_SCHEMES[number]['id'];

export const BASIC_PAYMENT_PER_HA = 180;
export const GREENING_BONUS_PCT = 0.30;
export const YOUNG_FARMER_BONUS_PCT = 0.25;
export const YOUNG_FARMER_MAX_DAY = 1825; // 5 years
export const AES_COMMITMENT_DAYS = 1825; // 5 years

export function calculateBasicPayment(ownedHa: number, leasedHa: number): number {
  const totalHa = ownedHa + leasedHa * 0.5;
  return Math.round(totalHa * BASIC_PAYMENT_PER_HA);
}

export function calculateGreening(
  basic: number,
  cropsGrownThisYear: string[],
  hedgerows: Hedgerow[],
  currentDay: number,
  strawBurnedThisYear: boolean,
): { qualified: boolean; amount: number; failReasons: string[] } {
  const failReasons: string[] = [];
  const diversityMet = cropsGrownThisYear.length >= 3;
  const efaMet = getEFACount(hedgerows, currentDay) >= 2;
  const noburn = !strawBurnedThisYear;

  if (!diversityMet) failReasons.push('crop_diversity');
  if (!efaMet) failReasons.push('efa');
  if (!noburn) failReasons.push('straw_burned');

  const qualified = diversityMet && efaMet && noburn;
  return {
    qualified,
    amount: qualified ? Math.round(basic * GREENING_BONUS_PCT) : 0,
    failReasons,
  };
}

export function calculateYoungFarmerBonus(basic: number, currentDay: number): number {
  return currentDay <= YOUNG_FARMER_MAX_DAY ? Math.round(basic * YOUNG_FARMER_BONUS_PCT) : 0;
}

export function calculateAESPayments(
  enrollments: AESEnrollment[],
  currentDay: number,
): { total: number; payments: { enrollmentId: string; amount: number }[] } {
  let total = 0;
  const payments: { enrollmentId: string; amount: number }[] = [];

  for (const en of enrollments) {
    if (en.status !== 'active') continue;
    const scheme = AES_SCHEMES.find(s => s.id === en.schemeId);
    if (!scheme) continue;
    const amount = Math.round(scheme.paymentPerHa * en.enrolledHa);
    total += amount;
    payments.push({ enrollmentId: en.id, amount });
  }

  return { total, payments };
}

export function calculateAnnualSubsidy(params: {
  currentDay: number;
  ownedHa: number;
  leasedHa: number;
  cropsGrownThisYear: string[];
  hedgerows: Hedgerow[];
  strawBurnedThisYear: boolean;
  aesEnrollments: AESEnrollment[];
}): SubsidyPayment {
  const basic = calculateBasicPayment(params.ownedHa, params.leasedHa);
  const greening = calculateGreening(
    basic,
    params.cropsGrownThisYear,
    params.hedgerows,
    params.currentDay,
    params.strawBurnedThisYear,
  );
  const youngFarmer = calculateYoungFarmerBonus(basic, params.currentDay);
  const aes = calculateAESPayments(params.aesEnrollments, params.currentDay);

  return {
    day: params.currentDay,
    basic,
    greening: greening.amount,
    youngFarmer,
    aes: aes.total,
    total: basic + greening.amount + youngFarmer + aes.total,
    greeningQualified: greening.qualified,
    greeningFailReasons: greening.failReasons,
  };
}

export function checkAESViolation(
  enrollment: AESEnrollment,
  parcels: Array<{ id: string; plantedCrop?: { cropId: string } | null; pesticideSprayedDay?: number }>,
  currentDay: number,
): boolean {
  if (enrollment.status !== 'active') return false;

  switch (enrollment.schemeId) {
    case 'aes_cover': {
      // Cover crop must be planted on enrolled parcels in winter
      // Simplified: check if any enrolled parcel has a cover crop currently
      const coverCropIds = new Set(['rye', 'clover', 'mustard', 'buckwheat']);
      const enrolledParcelIds = new Set(enrollment.enrolledParcels);
      const hasCover = parcels.some(
        p => enrolledParcelIds.has(p.id) && coverCropIds.has(p.plantedCrop?.cropId ?? ''),
      );
      return !hasCover;
    }
    case 'aes_lowpest': {
      // No synthetic pesticides on enrolled parcels in last 30 days
      const enrolledParcelIds = new Set(enrollment.enrolledParcels);
      return parcels.some(
        p =>
          enrolledParcelIds.has(p.id) &&
          p.pesticideSprayedDay !== undefined &&
          currentDay - p.pesticideSprayedDay <= 30,
      );
    }
    case 'aes_wetland':
    case 'aes_corridor':
      // These are checked via parcel flags / hedgerow state — out of scope for automated violation
      return false;
    default:
      return false;
  }
}

export function buildFailReasons(
  diversityMet: boolean,
  efaMet: boolean,
  noburn: boolean,
): string[] {
  const reasons: string[] = [];
  if (!diversityMet) reasons.push('crop_diversity');
  if (!efaMet) reasons.push('efa');
  if (!noburn) reasons.push('straw_burned');
  return reasons;
}
