/**
 * LONGEVITY 3.2 — DETERMINISTIC OFFLINE RULES ENGINE
 * Transparent, rule-based evidence evaluator based on the authoritative protocol.
 * Generates max 3 prioritized actionable insights without external AI calls.
 */

import {
  DailyLog,
  MealEntry,
  SupplementIntake,
  SupplementDefinition,
  WorkoutSession,
  UserProfile,
  AIInsight
} from '../types/protocol';
import { calculateProteinTargets } from './calculations';

export interface InsightContext {
  today: string;
  userProfile: UserProfile;
  dailyLog?: DailyLog;
  todayMeals: MealEntry[];
  todaySupplements: SupplementDefinition[];
  todayIntakes: SupplementIntake[];
  weekWorkouts: WorkoutSession[];
  recentDaysLogs: DailyLog[];
}

export function generateDeterministicInsights(ctx: InsightContext): AIInsight[] {
  const insights: AIInsight[] = [];
  const { today, userProfile, dailyLog, todayMeals, weekWorkouts } = ctx;

  const totalProtein = todayMeals.reduce((sum, m) => sum + m.protein, 0);
  const totalFibre = todayMeals.reduce((sum, m) => sum + m.fibre, 0);
  const proteinTarget = calculateProteinTargets(userProfile.weightKg, userProfile.targetProteinGPerKg);

  // 1. FUNDAMENTAL TIER 1: SOMN
  if (dailyLog?.sleepHours !== undefined) {
    if (dailyLog.sleepHours < 7.0) {
      insights.push({
        id: `det_sleep_${today}`,
        date: today,
        title: 'Somn sub pragul minim al protocolului (7–9 ore)',
        observation: `Ai înregistrat ${dailyLog.sleepHours.toFixed(1)} ore de somn azi-noapte (scor calitate: ${dailyLog.sleepQuality ?? 'neînregistrat'}/10). Protocolul Longevity 3.2 plasează somnul în Tier 1 Fundamental, nu ca opțional.`,
        suggestion: 'Prioritizează stingerea luminii cu 30-45 min mai devreme în această seară. Respectă răcirea dormitorului și rutina de seară (Glicină 3g + Magneziu L-treonat + Taurină) cu 1-2 ore înainte de culcare.',
        missingDataNotes: dailyLog.bedtime ? undefined : 'Ora de culcare nu a fost specificată.',
        priority: 'high',
        category: 'sleep',
        isDeterministic: true,
        createdAt: new Date().toISOString()
      });
    } else if (dailyLog.sleepHours >= 7.5 && dailyLog.sleepQuality && dailyLog.sleepQuality >= 8) {
      insights.push({
        id: `det_sleep_good_${today}`,
        date: today,
        title: 'Arhitectură de somn optimă confirmată',
        observation: `Durata de somn (${dailyLog.sleepHours.toFixed(1)} ore) și calitatea raportată (${dailyLog.sleepQuality}/10) susțin refacerea neuroplastică și regenerarea musculară.`,
        suggestion: 'Menține stabilitatea orei de trezire și expunerea de 10–20 minute la lumină naturală imediat după trezire pentru ancorarea ritmului circadian.',
        priority: 'low',
        category: 'sleep',
        isDeterministic: true,
        createdAt: new Date().toISOString()
      });
    }
  } else {
    insights.push({
      id: `det_sleep_missing_${today}`,
      date: today,
      title: 'Lipsă înregistrare somn nocturn',
      observation: 'Nu există date introduse pentru durata și calitatea somnului din noaptea precedentă.',
      suggestion: 'Înregistrează orele de somn în fila „Astăzi” pentru a calibra intensitatea antrenamentelor și refacerea.',
      missingDataNotes: 'Durată somn și calitate somn absente.',
      priority: 'medium',
      category: 'sleep',
      isDeterministic: true,
      createdAt: new Date().toISOString()
    });
  }

  // 2. FUNDAMENTAL TIER 1: NUTRIȚIE (PROTEINĂ ȘI FIBRE)
  if (todayMeals.length > 0) {
    if (totalProtein < proteinTarget.minGrams) {
      const deficit = Math.round(proteinTarget.targetGrams - totalProtein);
      insights.push({
        id: `det_protein_${today}`,
        date: today,
        title: `Aport proteic sub ținta protocolului (${proteinTarget.minGrams}–${proteinTarget.maxGrams} g)`,
        observation: `Total înregistrat până acum: ${Math.round(totalProtein)} g proteină față de ținta calculată de ${proteinTarget.targetGrams} g (${userProfile.targetProteinGPerKg} g/kg pentru greutatea de ${userProfile.weightKg} kg). Deficit rămas: ~${deficit} g.`,
        suggestion: `Asigură cel puțin 30–40 g proteină calitativă la următoarea masă (ex: ouă, somon, piept de pui sau iaurt grecesc) pentru a stimula sinteza proteică musculară (MPS).`,
        priority: 'high',
        category: 'nutrition',
        isDeterministic: true,
        createdAt: new Date().toISOString()
      });
    }

    if (totalFibre < userProfile.targetFibreG) {
      const fibreDeficit = Math.round(userProfile.targetFibreG - totalFibre);
      if (insights.length < 3) {
        insights.push({
          id: `det_fibre_${today}`,
          date: today,
          title: 'Aport de fibre sub pragul de 30 g/zi',
          observation: `Aport curent: ${Math.round(totalFibre)} g fibre (țintă protocol: ≥30 g/zi). Rămân ${fibreDeficit} g fibre de atins.`,
          suggestion: 'Adaugă 5 g psyllium conform protocolului (~3.9 g fibre) alături de legume la cuptor, murături în saramură sau o porție de afine/kiwi.',
          priority: 'medium',
          category: 'nutrition',
          isDeterministic: true,
          createdAt: new Date().toISOString()
        });
      }
    }
  } else {
    if (insights.length < 3) {
      insights.push({
        id: `det_meals_missing_${today}`,
        date: today,
        title: 'Nicio masă înregistrată azi',
        observation: 'Jurnalul alimentar pentru ziua de azi este gol.',
        suggestion: 'Înregistrează alimentele consumate pentru a monitoriza atingerea celor 1.6–2.2 g/kg proteină și a ferestrei de fasting 16:8.',
        missingDataNotes: 'Toate valorile macro-nutrienților sunt nule.',
        priority: 'medium',
        category: 'nutrition',
        isDeterministic: true,
        createdAt: new Date().toISOString()
      });
    }
  }

  // 3. FUNDAMENTAL TIER 1: FITNESS & PILONUL CARDIOVASCULAR
  const strengthSessions = weekWorkouts.filter(w => w.type === 'strength').length;
  const zone2Sessions = weekWorkouts.filter(w => w.type === 'zone2').length;
  const currentDayOfWeek = new Date(today).getDay(); // 0=Dum, 4=Joi etc.

  if (insights.length < 3) {
    if (zone2Sessions === 0 && currentDayOfWeek >= 3) {
      insights.push({
        id: `det_zone2_${today}`,
        date: today,
        title: 'Zone 2 restant în săptămâna curentă (0/2–4 sesiuni)',
        observation: `Suntem în a doua jumătate a săptămânii și nu ai nicio sesiune de Zone 2 logată (țintă: 2–4×/săptămână, 30–60 min).`,
        suggestion: 'Programează o sesiune aerobică de 40-45 min la intensitate conversațională sustenabilă (fără să o transformi într-un test de efort maxim).',
        priority: 'high',
        category: 'fitness',
        isDeterministic: true,
        createdAt: new Date().toISOString()
      });
    } else if (strengthSessions < 2 && currentDayOfWeek >= 4) {
      insights.push({
        id: `det_strength_${today}`,
        date: today,
        title: `Volum de forță scăzut (${strengthSessions}/3–4 antrenamente)`,
        observation: `Antrenamentele de forță sunt pilonul central pentru masa musculară și healthspan. Până acum ai efectuat ${strengthSessions} din cele 3-4 recomandate.`,
        suggestion: 'Programează un antrenament cu accent pe mișcări compuse (picioare, împins, tras, core) înainte de sfârșitul săptămânii.',
        priority: 'medium',
        category: 'fitness',
        isDeterministic: true,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Sort by priority (high > medium > low) and cap strictly at 3
  const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights.slice(0, 3);
}
