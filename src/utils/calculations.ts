/**
 * LONGEVITY 3.2 — CALCULATIONS & METRICS ENGINE
 * Deterministic formulas according to PROTOCOL_LONGEVITY_3.2_GOVERNED.md
 */

import { SupplementDefinition, WorkoutSession } from '../types/protocol';

/**
 * Calculează intervalul și ținta de proteine pe baza greutății corporale
 * Protocol: 1.6 – 2.2 g/kg/zi
 */
export function calculateProteinTargets(weightKg: number, factor: number = 1.8) {
  const safeWeight = Math.max(30, Math.min(200, weightKg || 75));
  const safeFactor = Math.max(1.6, Math.min(2.2, factor || 1.8));

  const minGrams = Math.round(safeWeight * 1.6);
  const maxGrams = Math.round(safeWeight * 2.2);
  const targetGrams = Math.round(safeWeight * safeFactor);

  return {
    weightKg: safeWeight,
    factor: safeFactor,
    minGrams,
    maxGrams,
    targetGrams,
    formula: `${safeWeight} kg × ${safeFactor.toFixed(1)} g/kg = ${targetGrams} g/zi (interval protocol: ${minGrams}–${maxGrams} g)`
  };
}

/**
 * Verifică dacă un supliment este programat în ziua curentă a săptămânii
 * 0 = Duminică, 1 = Luni, 2 = Marți, 3 = Miercuri, 4 = Joi, 5 = Vineri, 6 = Sâmbătă
 */
export function isSupplementScheduledForDate(
  supplement: SupplementDefinition,
  date: Date,
  citicolineSchedule: 'LMV' | 'LMJ' = 'LMV'
): boolean {
  const day = date.getDay(); // 0-6

  // Tratare specifică a ambiguității Citicolinei
  if (supplement.id === 'citicoline') {
    if (citicolineSchedule === 'LMJ') {
      return [1, 3, 4].includes(day); // Luni (1), Miercuri (3), Joi (4)
    }
    return [1, 3, 5].includes(day); // Luni (1), Miercuri (3), Vineri (5)
  }

  return supplement.scheduledDays.includes(day);
}

export interface CyclePhaseInfo {
  cycleIndex: number;
  phase: 'ON' | 'OFF';
  currentWeekInPhase: number;
  totalWeeksInPhase: number;
  daysRemainingInPhase: number;
  phaseStartDate: string;
  nextPhaseStartDate: string;
  progressPercent: number;
}

/**
 * Calculează starea ciclului experimental 8 săptămâni ON → 2 săptămâni OFF
 */
export function calculateExperimentalCycle(
  startDateStr: string,
  currentDate: Date = new Date(),
  weeksOn: number = 8,
  weeksOff: number = 2
): CyclePhaseInfo {
  const startDate = new Date(startDateStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / msPerDay));

  const daysOn = weeksOn * 7; // 56 zile
  const daysOff = weeksOff * 7; // 14 zile
  const cycleLengthDays = daysOn + daysOff; // 70 zile

  const cycleIndex = Math.floor(daysDiff / cycleLengthDays) + 1;
  const dayInCurrentCycle = daysDiff % cycleLengthDays;

  const isPhaseOn = dayInCurrentCycle < daysOn;
  const phase: 'ON' | 'OFF' = isPhaseOn ? 'ON' : 'OFF';
  const totalWeeksInPhase = isPhaseOn ? weeksOn : weeksOff;

  const dayInPhase = isPhaseOn ? dayInCurrentCycle : (dayInCurrentCycle - daysOn);
  const currentWeekInPhase = Math.min(totalWeeksInPhase, Math.floor(dayInPhase / 7) + 1);
  const totalDaysInPhase = isPhaseOn ? daysOn : daysOff;
  const daysRemainingInPhase = Math.max(0, totalDaysInPhase - dayInPhase);

  const currentPhaseStart = new Date(startDate.getTime() + (daysDiff - dayInPhase) * msPerDay);
  const nextPhaseStart = new Date(currentPhaseStart.getTime() + totalDaysInPhase * msPerDay);

  const progressPercent = Math.min(100, Math.round((dayInPhase / totalDaysInPhase) * 100));

  return {
    cycleIndex,
    phase,
    currentWeekInPhase,
    totalWeeksInPhase,
    daysRemainingInPhase,
    phaseStartDate: currentPhaseStart.toISOString().split('T')[0],
    nextPhaseStartDate: nextPhaseStart.toISOString().split('T')[0],
    progressPercent
  };
}

/**
 * Obține intervalul de date (Luni -> Duminică) pentru săptămâna curentă
 */
export function getCurrentWeekRange(referenceDate: Date = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay();
  // Luni = 1, Duminică = 7
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    monday: monday.toISOString().split('T')[0],
    sunday: sunday.toISOString().split('T')[0],
    mondayDate: monday,
    sundayDate: sunday
  };
}

/**
 * Calculează progresul săptămânal față de obiectivele protocolului
 */
export function calculateWeeklyFitnessProgress(sessions: WorkoutSession[]) {
  const strengthCount = sessions.filter(s => s.type === 'strength').length;
  const zone2Count = sessions.filter(s => s.type === 'zone2').length;
  const zone2Minutes = sessions.filter(s => s.type === 'zone2').reduce((acc, s) => acc + s.durationMinutes, 0);
  const vo2maxCount = sessions.filter(s => s.type === 'vo2max').length;
  const mobilityCount = sessions.filter(s => s.type === 'mobility').length;

  return {
    strength: {
      completed: strengthCount,
      targetMin: 3,
      targetMax: 4,
      status: strengthCount >= 3 ? 'atins' : 'în_curs'
    },
    zone2: {
      completedSessions: zone2Count,
      totalMinutes: zone2Minutes,
      targetSessionsMin: 2,
      targetSessionsMax: 4,
      targetMinutesMin: 60,
      targetMinutesMax: 180,
      status: zone2Count >= 2 ? 'atins' : 'în_curs'
    },
    vo2max: {
      completed: vo2maxCount,
      target: 1,
      status: vo2maxCount >= 1 ? 'atins' : 'în_curs'
    },
    mobility: {
      completed: mobilityCount,
      targetMin: 3,
      targetMax: 5,
      status: mobilityCount >= 3 ? 'atins' : 'în_curs'
    }
  };
}

/**
 * Formatare date în limba română
 */
export function formatRomanianDate(dateStr: string): string {
  const d = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return d.toLocaleDateString('ro-RO', options);
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

export function getWeekdayName(dayIndex: number): string {
  const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  return days[dayIndex] || '';
}

export function getWeekdayAbbr(dayIndex: number): string {
  const days = ['D', 'L', 'Ma', 'Mi', 'J', 'V', 'S'];
  return days[dayIndex] || '';
}
