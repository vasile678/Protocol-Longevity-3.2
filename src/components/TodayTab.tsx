import React, { useState } from 'react';
import {
  Moon,
  Flame,
  Dumbbell,
  Pill,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sun,
  Droplets,
  Eye,
  Check,
  ThumbsUp,
  ThumbsDown,
  Activity,
  FlaskConical,
  Settings as SettingsIcon,
  X
} from 'lucide-react';
import {
  DailyLog,
  MealEntry,
  SupplementDefinition,
  SupplementIntake,
  WorkoutSession,
  UserProfile,
  AIInsight,
  BiomarkerDefinition,
  LabResult
} from '../types/protocol';
import {
  calculateProteinTargets,
  formatRomanianDate,
  formatShortDate,
  isSupplementScheduledForDate
} from '../utils/calculations';
import { TabType } from './Navigation';

interface TodayTabProps {
  selectedDate: string;
  dailyLog?: DailyLog;
  userProfile: UserProfile;
  todayMeals: MealEntry[];
  supplements: SupplementDefinition[];
  intakes: SupplementIntake[];
  todayWorkouts: WorkoutSession[];
  aiInsights: AIInsight[];
  biomarkers?: BiomarkerDefinition[];
  labResults?: LabResult[];
  longitudinalShifts?: string[];
  onUpdateDailyLog: (log: Partial<DailyLog>) => Promise<void>;
  onToggleSupplementIntake: (supplementId: string, status: 'taken' | 'skipped') => Promise<void>;
  onNavigateToTab: (tab: TabType) => void;
  onUpdateInsightFeedback: (id: string, feedback: 'useful' | 'not_useful' | 'completed') => Promise<void>;
  onOpenSettings?: () => void;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  selectedDate,
  dailyLog,
  userProfile,
  todayMeals,
  supplements,
  intakes,
  todayWorkouts,
  aiInsights,
  biomarkers = [],
  labResults = [],
  longitudinalShifts = [],
  onUpdateDailyLog,
  onToggleSupplementIntake,
  onNavigateToTab,
  onUpdateInsightFeedback,
  onOpenSettings
}) => {
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [sleepHoursInput, setSleepHoursInput] = useState(dailyLog?.sleepHours?.toString() || '7.5');
  const [sleepQualityInput, setSleepQualityInput] = useState(dailyLog?.sleepQuality?.toString() || '8');

  // --- 1. KPI COMPUTATIONS ---
  // Sleep
  const hasSleep = typeof dailyLog?.sleepHours === 'number' && dailyLog.sleepHours > 0;
  const sleepDisplay = hasSleep ? `${dailyLog?.sleepHours}h` : 'Neînregistrat';
  const sleepStatus = hasSleep
    ? (dailyLog!.sleepHours! >= 7 && dailyLog!.sleepHours! <= 9 ? 'Optim (7–9h)' : dailyLog!.sleepHours! < 7 ? 'Sub 7 ore' : 'Peste 9 ore')
    : 'Țintă: 7–9 ore';

  // Nutrition & Protein
  const totalProtein = Math.round(todayMeals.reduce((s, m) => s + (m.protein || 0), 0));
  const totalCalories = Math.round(todayMeals.reduce((s, m) => s + (m.calories || 0), 0));
  const proteinTarget = calculateProteinTargets(userProfile.weightKg, userProfile.targetProteinGPerKg);
  const hasMeals = todayMeals.length > 0;
  const proteinPercent = Math.min(100, Math.round((totalProtein / proteinTarget.targetGrams) * 100));

  // Activity / Workouts
  const totalWorkoutMinutes = todayWorkouts.reduce((s, w) => s + (w.durationMinutes || 0), 0);
  const hasWorkouts = todayWorkouts.length > 0;
  const workoutDisplay = hasWorkouts
    ? `${totalWorkoutMinutes} min`
    : 'Neînregistrat';

  // Supplements
  const targetDateObj = new Date(selectedDate);
  const scheduledToday = supplements.filter(s =>
    isSupplementScheduledForDate(s, targetDateObj, userProfile.citicolineWeekdaySchedule)
  );
  const getSupplementStatus = (id: string) => {
    const intake = intakes.find(i => i.supplementId === id);
    return intake?.status || 'pending';
  };
  const completedIntakes = scheduledToday.filter(s => getSupplementStatus(s.id) === 'taken');
  const completedCount = completedIntakes.length;
  const scheduledCount = scheduledToday.length;
  const pendingCount = scheduledToday.filter(s => getSupplementStatus(s.id) === 'pending').length;

  const suppsDisplay = scheduledCount > 0
    ? `${completedCount}/${scheduledCount}`
    : '0 programate';

  // --- 2. DETERMINISTIC PRIORITIES OF THE DAY (MAX 3) ---
  interface PriorityItem {
    id: string;
    title: string;
    description: string;
    actionLabel: string;
    onClick: () => void;
    icon: React.ElementType;
    urgencyColor: string;
  }

  const generatedPriorities: PriorityItem[] = [];

  // Priority: Sleep Log
  if (!hasSleep) {
    generatedPriorities.push({
      id: 'log-sleep',
      title: 'Înregistrează somnul de noapte',
      description: 'Pilonul 1 — Durata și calitatea somnului guvernează recuperarea celulară.',
      actionLabel: 'Loghează somn',
      onClick: () => setIsSleepModalOpen(true),
      icon: Moon,
      urgencyColor: 'text-indigo-400 border-indigo-800/60 bg-indigo-950/40'
    });
  }

  // Priority: Pending Supplements
  if (pendingCount > 0) {
    generatedPriorities.push({
      id: 'pending-supps',
      title: `Finalizează doza de suplimente (${pendingCount} rămase)`,
      description: `${scheduledCount - pendingCount} administrate din ${scheduledCount} programate azi.`,
      actionLabel: 'Vezi protocol',
      onClick: () => onNavigateToTab('supplements'),
      icon: Pill,
      urgencyColor: 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40'
    });
  }

  // Priority: Nutrition
  if (!hasMeals) {
    generatedPriorities.push({
      id: 'first-meal',
      title: 'Înregistrează prima masă din zi',
      description: `Țintă zilnică: ${proteinTarget.targetGrams}g proteină (${userProfile.weightKg} kg × ${userProfile.targetProteinGPerKg} g/kg).`,
      actionLabel: 'Jurnal mese',
      onClick: () => onNavigateToTab('nutrition'),
      icon: Flame,
      urgencyColor: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40'
    });
  } else if (totalProtein < proteinTarget.minGrams) {
    const deficit = proteinTarget.targetGrams - totalProtein;
    generatedPriorities.push({
      id: 'protein-deficit',
      title: `Atinge pragul proteic: mai sunt necesare ${deficit}g`,
      description: `Ai acumulat ${totalProtein}g din ținta optimă de ${proteinTarget.targetGrams}g.`,
      actionLabel: 'Adaugă alimente',
      onClick: () => onNavigateToTab('nutrition'),
      icon: Flame,
      urgencyColor: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40'
    });
  }

  // Priority: Workout
  if (!hasWorkouts && generatedPriorities.length < 3) {
    generatedPriorities.push({
      id: 'workout-today',
      title: 'Sesiune de activitate fizică',
      description: 'Protocolul recomandă alternanța săptămânală Forță, Zone 2 și Mobilitate.',
      actionLabel: 'Loghează antrenament',
      onClick: () => onNavigateToTab('fitness'),
      icon: Dumbbell,
      urgencyColor: 'text-amber-400 border-amber-800/60 bg-amber-950/40'
    });
  }

  // Priority: Morning Circadian habits
  if (!dailyLog?.morningLightMinutes && generatedPriorities.length < 3) {
    generatedPriorities.push({
      id: 'morning-light',
      title: 'Expunere 10–20 min la lumină naturală',
      description: 'Sincronizează ceasul central SCN și ancorează ritmul cortizol/melatonină.',
      actionLabel: 'Bifează 15m',
      onClick: () => onUpdateDailyLog({ morningLightMinutes: 15 }),
      icon: Sun,
      urgencyColor: 'text-amber-300 border-amber-800/50 bg-amber-950/30'
    });
  }

  // Keep strictly max 3 items
  const displayPriorities = generatedPriorities.slice(0, 3);

  // --- 3. RECENT LABS & TRENDS COMPACT SUMMARY ---
  // Sort labResults descending by testDate
  const sortedLabResults = [...labResults].sort((a, b) => {
    return new Date(b.testDate).getTime() - new Date(a.testDate).getTime();
  });
  const recentLabs = sortedLabResults.slice(0, 3);

  const getBiomarkerName = (id: string) => {
    const b = biomarkers.find(item => item.id === id);
    return b?.name || id;
  };

  // --- 4. TOP AI INSIGHT (SINGLE) ---
  const topInsight = aiInsights.length > 0 ? aiInsights[0] : null;

  // --- 5. SLEEP MODAL SAVE ---
  const handleSaveSleep = async () => {
    const hours = parseFloat(sleepHoursInput);
    const quality = parseInt(sleepQualityInput, 10);
    await onUpdateDailyLog({
      sleepHours: isNaN(hours) ? undefined : hours,
      sleepQuality: isNaN(quality) ? undefined : quality
    });
    setIsSleepModalOpen(false);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-1 sm:px-2 pb-6">
      {/* EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/50 text-cyan-300 font-semibold">
              Executive Health Dashboard
            </span>
            <span className="text-xs text-slate-400 capitalize">
              {formatRomanianDate(selectedDate)}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">
            Sinteza Zilei & Protocol Longevity 3.2
          </h2>
        </div>

        {onOpenSettings && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Setări & Date</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 ESSENTIAL KPIS (2 columns on mobile, 4 columns on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* KPI 1: SOMN */}
        <button
          onClick={() => setIsSleepModalOpen(true)}
          className="text-left rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-indigo-500/40 p-3 sm:p-3.5 flex flex-col justify-between transition-all hover:bg-slate-900 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Somn
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-950/70 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Moon className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${hasSleep ? 'text-white' : 'text-slate-400 text-sm sm:text-base'}`}>
                {sleepDisplay}
              </span>
              {hasSleep && (
                <span className="text-[10px] text-slate-400 font-mono">/ 7–9h</span>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className={`truncate font-medium ${hasSleep ? 'text-indigo-300' : 'text-slate-400'}`}>
                {sleepStatus}
              </span>
              <span className="text-cyan-400 font-mono text-[9px] ml-1 shrink-0">
                {hasSleep ? 'Edit' : '+ Log'}
              </span>
            </div>
          </div>
        </button>

        {/* KPI 2: NUTRIȚIE (PROTEINĂ) */}
        <button
          onClick={() => onNavigateToTab('nutrition')}
          className="text-left rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-emerald-500/40 p-3 sm:p-3.5 flex flex-col justify-between transition-all hover:bg-slate-900 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Proteină
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${hasMeals ? 'text-white' : 'text-slate-400 text-sm sm:text-base'}`}>
                {hasMeals ? `${totalProtein}g` : 'Neînregistrat'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                / {proteinTarget.targetGrams}g
              </span>
            </div>

            {/* Micro progress bar */}
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${hasMeals ? proteinPercent : 0}%` }}
              />
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 truncate">
                {hasMeals ? `${totalCalories} kcal · ${proteinPercent}%` : '0 mese azi'}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
            </div>
          </div>
        </button>

        {/* KPI 3: ACTIVITATE / FITNESS */}
        <button
          onClick={() => onNavigateToTab('fitness')}
          className="text-left rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/40 p-3 sm:p-3.5 flex flex-col justify-between transition-all hover:bg-slate-900 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Activitate
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-950/70 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${hasWorkouts ? 'text-white' : 'text-slate-400 text-sm sm:text-base'}`}>
                {workoutDisplay}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 truncate">
                {hasWorkouts ? `${todayWorkouts.length} sesiune${todayWorkouts.length > 1 ? 'i' : ''}` : 'Țintă: Forță/Z2'}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
            </div>
          </div>
        </button>

        {/* KPI 4: SUPLIMENTE */}
        <button
          onClick={() => onNavigateToTab('supplements')}
          className="text-left rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-cyan-500/40 p-3 sm:p-3.5 flex flex-col justify-between transition-all hover:bg-slate-900 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Suplimente
            </span>
            <div className="w-6 h-6 rounded-lg bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Pill className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight">
                {suppsDisplay}
              </span>
              {scheduledCount > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">luate</span>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className={`truncate font-medium ${scheduledCount > 0 && completedCount === scheduledCount ? 'text-emerald-400' : 'text-slate-400'}`}>
                {scheduledCount === 0
                  ? 'Fără doză azi'
                  : completedCount === scheduledCount
                    ? 'Completate ✓'
                    : `${pendingCount} în așteptare`}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
            </div>
          </div>
        </button>
      </div>

      {/* QUICK CIRCADIAN HABITS (Inline 1-tap toggles) */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-2 sm:p-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Rutine Circadiene Rapide
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">1-tap</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => onUpdateDailyLog({ morningLightMinutes: dailyLog?.morningLightMinutes ? 0 : 15 })}
            className={`p-2 rounded-lg border text-left transition-colors flex items-center justify-between gap-1 ${
              (dailyLog?.morningLightMinutes || 0) > 0
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate text-[11px]">Lumină 15m</span>
            </div>
            <span className="text-[10px] font-mono shrink-0">
              {(dailyLog?.morningLightMinutes || 0) > 0 ? '✓' : '+'}
            </span>
          </button>

          <button
            onClick={() => onUpdateDailyLog({ morningHydrationDone: !dailyLog?.morningHydrationDone })}
            className={`p-2 rounded-lg border text-left transition-colors flex items-center justify-between gap-1 ${
              dailyLog?.morningHydrationDone
                ? 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate text-[11px]">Apă + Sare</span>
            </div>
            <span className="text-[10px] font-mono shrink-0">
              {dailyLog?.morningHydrationDone ? '✓' : '+'}
            </span>
          </button>

          <button
            onClick={() => onUpdateDailyLog({ eveningWindDownDone: !dailyLog?.eveningWindDownDone })}
            className={`p-2 rounded-lg border text-left transition-colors flex items-center justify-between gap-1 ${
              dailyLog?.eveningWindDownDone
                ? 'bg-indigo-950/30 border-indigo-800/60 text-indigo-200'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate text-[11px]">Rutină seară</span>
            </div>
            <span className="text-[10px] font-mono shrink-0">
              {dailyLog?.eveningWindDownDone ? '✓' : '+'}
            </span>
          </button>
        </div>
      </div>

      {/* PRIORITĂȚILE ZILEI (MAXIMUM 3 RELEVANTE) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Prioritățile Zilei
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {displayPriorities.length > 0 ? `${displayPriorities.length} acțiuni prioritare` : 'Protocol complet'}
          </span>
        </div>

        {displayPriorities.length > 0 ? (
          <div className="space-y-2">
            {displayPriorities.map(p => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${p.urgencyColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {p.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={p.onClick}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 flex items-center gap-1 transition-colors"
                  >
                    <span>{p.actionLabel}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-300">Toate prioritățile esențiale sunt îndeplinite!</p>
              <p className="text-[11px] text-emerald-400/80">Protocolul zilei este respectat. Menține stabilitatea circadiană și relaxarea de seară.</p>
            </div>
          </div>
        )}
      </div>

      {/* ANALIZE & TENDINȚE (Compact Lab Summary) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-950/70 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Analize & Tendințe
              </h3>
              <span className="text-[10px] text-slate-400">Rezumat clinic compact</span>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('labs')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            <span>Deschide modulul Analize</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentLabs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {recentLabs.map(res => (
              <div
                key={res.id}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-semibold text-white block truncate">
                    {getBiomarkerName(res.biomarkerId)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {formatShortDate(res.testDate)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-white font-mono block">
                    {res.value} <span className="text-[10px] font-normal text-slate-400">{res.unit}</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-slate-800 text-slate-300">
                    Înregistrat
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs text-slate-400">
              <span className="font-medium text-slate-300">Nicio analiză de laborator înregistrată încă.</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Protocolul Longevity 3.2 recomandă verificarea periodică la 6–12 luni (ApoB, Trigliceride, HbA1c, etc.).
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('labs')}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-medium hover:bg-cyan-900 transition-colors"
            >
              Adaugă analize
            </button>
          </div>
        )}
      </div>

      {/* AI COACH (Single Short Insight) */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-cyan-950/20 border border-cyan-900/40 p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              AI Coach & Evaluare Clinică
            </span>
            {topInsight && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-400 font-mono">
                {topInsight.isDeterministic ? 'Determinist' : 'Gemini'}
              </span>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('ai')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            <span>Vezi detalii</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topInsight ? (
          <div className="space-y-1.5">
            <h4 className="text-xs sm:text-sm font-semibold text-white">
              {topInsight.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {topInsight.observation}
            </p>
            {topInsight.suggestion && (
              <p className="text-xs text-cyan-200/90 font-medium bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                💡 {topInsight.suggestion}
              </p>
            )}

            {/* Micro feedback */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
              <span>Feedback evaluare:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateInsightFeedback(topInsight.id, 'useful')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                    topInsight.feedback === 'useful'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" /> Util
                </button>
                <button
                  onClick={() => onUpdateInsightFeedback(topInsight.id, 'not_useful')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                    topInsight.feedback === 'not_useful'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <ThumbsDown className="w-3 h-3" /> Neutil
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <p className="text-xs text-slate-400">
              Sistemul poate analiza datele înregistrate de somn, nutriție și fitness pentru a genera sinteza zilei.
            </p>
            <button
              onClick={() => onNavigateToTab('ai')}
              className="shrink-0 px-3 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-medium hover:bg-cyan-900 transition-colors"
            >
              Generează sinteză
            </button>
          </div>
        )}
      </div>

      {/* SLEEP MODAL (Clean, inline, fast modal for iPhone & Desktop) */}
      {isSleepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-indigo-400">
                <Moon className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">Înregistrare Somn Nocturn</h3>
              </div>
              <button
                onClick={() => setIsSleepModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Durată somn (ore, ex: 7.5)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="3"
                  max="14"
                  value={sleepHoursInput}
                  onChange={e => setSleepHoursInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="7.5"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Țintă protocol: 7–9 ore somn neîntrerupt
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Calitate percepută (1–10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={sleepQualityInput}
                  onChange={e => setSleepQualityInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="8"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSleepModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleSaveSleep}
                className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
              >
                Salvează Somn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
