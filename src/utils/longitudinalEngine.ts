/**
 * LONGEVITY 3.2 — LONGITUDINAL HEALTH MEMORY ENGINE
 * Computes 7-day, 30-day, 90-day and all-time rolling healthspan trends.
 * Synthesizes privacy-preserving, minimal AI memory summaries.
 */

import {
  DailyLog,
  MealEntry,
  WorkoutSession,
  SupplementIntake,
  BodyMeasurement,
  AIInsight,
  LongitudinalMetrics,
  AIMemorySummary
} from '../types/protocol';

/**
 * Calculează metricile longitudinale pentru o fereastră de timp (7, 30, 90 de zile sau tot istoricul)
 */
export function calculateLongitudinalMetrics(
  periodDays: number,
  dailyLogs: DailyLog[],
  meals: MealEntry[],
  workouts: WorkoutSession[],
  intakes: SupplementIntake[],
  measurements: BodyMeasurement[],
  aiInsights: AIInsight[],
  referenceDateStr: string = new Date().toISOString().split('T')[0]
): LongitudinalMetrics {
  const refDate = new Date(referenceDateStr);
  const msPerDay = 1000 * 60 * 60 * 24;

  const isAllTime = periodDays <= 0 || periodDays >= 3650;
  const cutoffTime = isAllTime ? 0 : refDate.getTime() - (periodDays - 1) * msPerDay;
  const cutoffDateStr = new Date(cutoffTime).toISOString().split('T')[0];

  // Filtrare pe interval [cutoffDateStr, referenceDateStr]
  const periodLogs = dailyLogs.filter(l => l.date <= referenceDateStr && (isAllTime || l.date >= cutoffDateStr));
  const periodMeals = meals.filter(m => m.date <= referenceDateStr && (isAllTime || m.date >= cutoffDateStr));
  const periodWorkouts = workouts.filter(w => w.date <= referenceDateStr && (isAllTime || w.date >= cutoffDateStr));
  const periodIntakes = intakes.filter(i => i.date <= referenceDateStr && (isAllTime || i.date >= cutoffDateStr));
  const periodMeasurements = measurements.filter(m => m.date <= referenceDateStr && (isAllTime || m.date >= cutoffDateStr));
  const periodInsights = aiInsights.filter(i => i.date <= referenceDateStr && (isAllTime || i.date >= cutoffDateStr));

  // 1. Somn
  const validSleepHours = periodLogs.filter(l => l.sleepHours !== undefined && l.sleepHours > 0).map(l => l.sleepHours!);
  const avgSleepHours = validSleepHours.length > 0
    ? parseFloat((validSleepHours.reduce((a, b) => a + b, 0) / validSleepHours.length).toFixed(1))
    : 0;

  const validSleepQuality = periodLogs.filter(l => l.sleepQuality !== undefined && l.sleepQuality > 0).map(l => l.sleepQuality!);
  const avgSleepQuality = validSleepQuality.length > 0
    ? parseFloat((validSleepQuality.reduce((a, b) => a + b, 0) / validSleepQuality.length).toFixed(1))
    : 0;

  // 2. Nutriție agregată pe zile
  const mealsByDay: Record<string, { protein: number; fibre: number; calories: number }> = {};
  periodMeals.forEach(m => {
    if (!mealsByDay[m.date]) {
      mealsByDay[m.date] = { protein: 0, fibre: 0, calories: 0 };
    }
    mealsByDay[m.date].protein += m.protein;
    mealsByDay[m.date].fibre += m.fibre;
    mealsByDay[m.date].calories += m.calories;
  });

  const loggedDaysCount = Math.max(1, Object.keys(mealsByDay).length);
  const totalProteinSum = Object.values(mealsByDay).reduce((s, d) => s + d.protein, 0);
  const totalFibreSum = Object.values(mealsByDay).reduce((s, d) => s + d.fibre, 0);
  const totalCaloriesSum = Object.values(mealsByDay).reduce((s, d) => s + d.calories, 0);

  const avgProtein = parseFloat((totalProteinSum / loggedDaysCount).toFixed(1));
  const avgFibre = parseFloat((totalFibreSum / loggedDaysCount).toFixed(1));
  const avgCalories = Math.round(totalCaloriesSum / loggedDaysCount);

  // 3. Suplimente (rata de luare)
  const takenCount = periodIntakes.filter(i => i.status === 'taken').length;
  const totalIntakeRecords = periodIntakes.length;
  const supplementAdherencePct = totalIntakeRecords > 0
    ? Math.round((takenCount / totalIntakeRecords) * 100)
    : 100;

  // 4. Fitness
  const strengthCount = periodWorkouts.filter(w => w.type === 'strength').length;
  const zone2Minutes = periodWorkouts.filter(w => w.type === 'zone2').reduce((acc, w) => acc + w.durationMinutes, 0);
  const vo2maxCount = periodWorkouts.filter(w => w.type === 'vo2max').length;
  const mobilityCount = periodWorkouts.filter(w => w.type === 'mobility').length;

  // 5. Greutate & Talie Delta
  const sortedMeas = [...periodMeasurements].sort((a, b) => a.date.localeCompare(b.date));
  let weightDeltaKg: number | undefined;
  let waistDeltaCm: number | undefined;

  if (sortedMeas.length >= 2) {
    const firstMeas = sortedMeas[0];
    const lastMeas = sortedMeas[sortedMeas.length - 1];
    if (firstMeas.weightKg !== undefined && lastMeas.weightKg !== undefined) {
      weightDeltaKg = parseFloat((lastMeas.weightKg - firstMeas.weightKg).toFixed(1));
    }
    if (firstMeas.waistCircumferenceCm !== undefined && lastMeas.waistCircumferenceCm !== undefined) {
      waistDeltaCm = parseFloat((lastMeas.waistCircumferenceCm - firstMeas.waistCircumferenceCm).toFixed(1));
    }
  }

  // 6. Acțiuni finalizate din sugestii AI
  const completedActionsCount = periodInsights.filter(i => i.feedback === 'completed').length;

  return {
    periodDays: isAllTime ? (dailyLogs.length || 1) : periodDays,
    startDate: cutoffDateStr,
    endDate: referenceDateStr,
    daysLogged: periodLogs.length,
    averageSleepHours: avgSleepHours,
    averageSleepQuality: avgSleepQuality,
    averageProteinG: avgProtein,
    averageFibreG: avgFibre,
    averageCalories: avgCalories,
    supplementAdherencePct,
    strengthSessionsTotal: strengthCount,
    zone2MinutesTotal: zone2Minutes,
    vo2maxSessionsTotal: vo2maxCount,
    mobilitySessionsTotal: mobilityCount,
    weightDeltaKg,
    waistDeltaCm,
    completedActionsCount
  };
}

/**
 * Construiește un rezumat minim și sigur de memorie AI pentru transmiterea către Gemini
 * Respectă principiul minimizării datelor și al distincției dintre observație și ipoteză
 */
export function buildAIMemorySummary(
  dailyLogs: DailyLog[],
  meals: MealEntry[],
  workouts: WorkoutSession[],
  intakes: SupplementIntake[],
  measurements: BodyMeasurement[],
  aiInsights: AIInsight[],
  referenceDate: string = new Date().toISOString().split('T')[0]
): AIMemorySummary {
  const m7 = calculateLongitudinalMetrics(7, dailyLogs, meals, workouts, intakes, measurements, aiInsights, referenceDate);
  const m30 = calculateLongitudinalMetrics(30, dailyLogs, meals, workouts, intakes, measurements, aiInsights, referenceDate);

  // Extrage acțiunile finalizate anterior
  const previousCompletedActions = aiInsights
    .filter(i => i.feedback === 'completed')
    .slice(-5)
    .map(i => `${i.title}: ${i.suggestion.slice(0, 80)}...`);

  // Extrage sugestiile utile anterioare
  const previousUsefulInsights = aiInsights
    .filter(i => i.feedback === 'useful')
    .slice(-4)
    .map(i => i.title);

  // Observații confirmate din date (strict fapte statistice)
  const confirmedObservations: string[] = [];
  if (m30.averageSleepHours >= 7.5) {
    confirmedObservations.push(`Media somnului pe 30 de zile este optimă (${m30.averageSleepHours} ore/noapte).`);
  } else if (m30.averageSleepHours > 0 && m30.averageSleepHours < 7.0) {
    confirmedObservations.push(`Media somnului pe 30 de zile este deficitară (${m30.averageSleepHours} ore/noapte față de ținta de 7–9h).`);
  }

  if (m30.averageProteinG >= 130) {
    confirmedObservations.push(`Aportul mediu proteic pe 30 de zile este susținut (${m30.averageProteinG} g/zi).`);
  }

  if (m30.strengthSessionsTotal >= 12) {
    confirmedObservations.push(`Frecvența antrenamentelor de forță este optimă (~${Math.round(m30.strengthSessionsTotal / 4.2)}/săpt).`);
  }

  // Ipoteze sub evaluare (niciodată asumate drept certitudini de cauzalitate)
  const hypothesesUnderReview = [
    'Monitorizarea impactului ciclării 8s ON Methylene Blue asupra anduranței aerobe Zone 2',
    'Corelarea stabilității orei de stingere a luminii cu scorul de calitate al somnului',
    'Impactul aportului de 5g psyllium asupra tranzitului și biomarkerilor lipidici'
  ];

  return {
    past7dAverages: {
      sleepHours: m7.averageSleepHours,
      proteinG: m7.averageProteinG,
      fibreG: m7.averageFibreG,
      supplementAdherencePct: m7.supplementAdherencePct,
      workoutsCount: m7.strengthSessionsTotal + Math.round(m7.zone2MinutesTotal / 45) + m7.vo2maxSessionsTotal
    },
    past30dAverages: {
      sleepHours: m30.averageSleepHours,
      proteinG: m30.averageProteinG,
      fibreG: m30.averageFibreG,
      supplementAdherencePct: m30.supplementAdherencePct,
      workoutsCount: m30.strengthSessionsTotal + Math.round(m30.zone2MinutesTotal / 45) + m30.vo2maxSessionsTotal
    },
    previousCompletedActions,
    previousUsefulInsights,
    confirmedObservations,
    hypothesesUnderReview
  };
}

/**
 * Identifică modificările sau deviațiile relevante dintre ultimele 7 zile și media pe 30 de zile
 */
export function identifyLongitudinalShifts(
  m7: LongitudinalMetrics,
  m30: LongitudinalMetrics
): string[] {
  const shifts: string[] = [];

  // Schimbare în somn
  if (m7.averageSleepHours > 0 && m30.averageSleepHours > 0) {
    const sleepDiff = m7.averageSleepHours - m30.averageSleepHours;
    if (sleepDiff <= -0.6) {
      shifts.push(`Somnul pe ultimele 7 zile (${m7.averageSleepHours}h) a scăzut cu ${Math.abs(sleepDiff).toFixed(1)}h față de media ta pe 30 de zile (${m30.averageSleepHours}h).`);
    } else if (sleepDiff >= 0.6) {
      shifts.push(`Somnul pe ultimele 7 zile (${m7.averageSleepHours}h) a crescut cu +${sleepDiff.toFixed(1)}h față de media pe 30 de zile.`);
    }
  }

  // Schimbare în aport proteic
  if (m7.averageProteinG > 0 && m30.averageProteinG > 0) {
    const protDiff = m7.averageProteinG - m30.averageProteinG;
    if (protDiff <= -15) {
      shifts.push(`Aportul proteic recent (${m7.averageProteinG}g) este mai scăzut cu ${Math.abs(protDiff).toFixed(0)}g/zi față de media pe 30 de zile (${m30.averageProteinG}g).`);
    } else if (protDiff >= 15) {
      shifts.push(`Aportul proteic pe ultimele 7 zile (${m7.averageProteinG}g) indică o îmbunătățire de +${protDiff.toFixed(0)}g/zi față de media pe 30 de zile.`);
    }
  }

  // Aderență la suplimente
  if (m7.supplementAdherencePct < 75 && m30.supplementAdherencePct >= 85) {
    shifts.push(`Aderența la suplimente a scăzut la ${m7.supplementAdherencePct}% în ultima săptămână (față de ${m30.supplementAdherencePct}% pe 30 de zile).`);
  }

  return shifts;
}
