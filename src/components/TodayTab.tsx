import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Flame,
  Dumbbell,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Coffee,
  Droplets,
  Eye,
  Check,
  ThumbsUp,
  ThumbsDown,
  ArrowRight
} from 'lucide-react';
import {
  DailyLog,
  MealEntry,
  SupplementDefinition,
  SupplementIntake,
  WorkoutSession,
  UserProfile,
  AIInsight
} from '../types/protocol';
import {
  calculateProteinTargets,
  formatRomanianDate,
  isSupplementScheduledForDate
} from '../utils/calculations';

interface TodayTabProps {
  selectedDate: string;
  dailyLog?: DailyLog;
  userProfile: UserProfile;
  todayMeals: MealEntry[];
  supplements: SupplementDefinition[];
  intakes: SupplementIntake[];
  todayWorkouts: WorkoutSession[];
  aiInsights: AIInsight[];
  longitudinalShifts?: string[];
  onUpdateDailyLog: (log: Partial<DailyLog>) => Promise<void>;
  onToggleSupplementIntake: (supplementId: string, status: 'taken' | 'skipped') => Promise<void>;
  onNavigateToTab: (tab: any) => void;
  onUpdateInsightFeedback: (id: string, feedback: 'useful' | 'not_useful' | 'completed') => Promise<void>;
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
  longitudinalShifts = [],
  onUpdateDailyLog,
  onToggleSupplementIntake,
  onNavigateToTab,
  onUpdateInsightFeedback
}) => {
  const [editingSleep, setEditingSleep] = useState(false);
  const [sleepHoursInput, setSleepHoursInput] = useState(dailyLog?.sleepHours?.toString() || '7.5');
  const [sleepQualityInput, setSleepQualityInput] = useState(dailyLog?.sleepQuality?.toString() || '8');

  // Nutrition totals for today
  const totalCalories = Math.round(todayMeals.reduce((s, m) => s + m.calories, 0));
  const totalProtein = Math.round(todayMeals.reduce((s, m) => s + m.protein, 0));
  const totalFibre = Math.round(todayMeals.reduce((s, m) => s + m.fibre, 0));
  const proteinTarget = calculateProteinTargets(userProfile.weightKg, userProfile.targetProteinGPerKg);
  const proteinPercent = Math.min(100, Math.round((totalProtein / proteinTarget.targetGrams) * 100));
  const fibrePercent = Math.min(100, Math.round((totalFibre / userProfile.targetFibreG) * 100));

  // Supplements scheduled for today's weekday
  const targetDateObj = new Date(selectedDate);
  const scheduledToday = supplements.filter(s =>
    isSupplementScheduledForDate(s, targetDateObj, userProfile.citicolineWeekdaySchedule)
  );
  const morningSupps = scheduledToday.filter(s => s.timing === 'dimineata');
  const eveningSupps = scheduledToday.filter(s => s.timing === 'seara');

  const getSupplementStatus = (id: string) => {
    const intake = intakes.find(i => i.supplementId === id);
    return intake?.status || 'pending';
  };

  const handleSaveSleep = async () => {
    const hours = parseFloat(sleepHoursInput);
    const quality = parseInt(sleepQualityInput, 10);
    await onUpdateDailyLog({
      sleepHours: isNaN(hours) ? undefined : hours,
      sleepQuality: isNaN(quality) ? undefined : quality
    });
    setEditingSleep(false);
  };

  // Outstanding tasks calculation
  const outstandingTasks: string[] = [];
  if (!dailyLog?.sleepHours) outstandingTasks.push('Înregistrează orele de somn nocturn');
  if (!dailyLog?.morningLightMinutes) outstandingTasks.push('Bifează 10–20 min lumină naturală matinală');
  if (!dailyLog?.morningHydrationDone) outstandingTasks.push('Hidratare matinală: 400ml apă + 1g sare');
  const pendingSuppsCount = scheduledToday.filter(s => getSupplementStatus(s.id) === 'pending').length;
  if (pendingSuppsCount > 0) outstandingTasks.push(`${pendingSuppsCount} suplimente programate nebifate`);
  if (todayMeals.length === 0) outstandingTasks.push('Înregistrează prima masă din zi');
  if (totalProtein < proteinTarget.minGrams && todayMeals.length > 0) {
    outstandingTasks.push(`Deficit proteic de ${proteinTarget.targetGrams - totalProtein} g pentru ținta de azi`);
  }

  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto px-4 pt-2">
      {/* Date Header & Core Philosophy */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div>
          <span className="text-xs font-medium text-cyan-400 capitalize">
            {formatRomanianDate(selectedDate)}
          </span>
          <p className="text-[11px] text-slate-400">
            Stabilitate &gt; stimulare · Healthspan &gt; biohacking
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-400">
            Țintă proteină: <strong className="text-slate-200">{proteinTarget.targetGrams}g</strong>
          </span>
        </div>
      </div>

      {/* AI Daily Insight Banner (Max 1-2 highlight on Today) */}
      {aiInsights.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-800/40 p-4 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {aiInsights[0].isDeterministic ? 'Evaluare Deterministă Longevity' : 'AI Healthspan Insight'}
              </span>
            </div>
            <button
              onClick={() => onNavigateToTab('ai')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              Vezi toate ({aiInsights.length}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">{aiInsights[0].title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{aiInsights[0].observation}</p>
            <p className="text-xs text-cyan-200/90 font-medium pt-1">
              💡 {aiInsights[0].suggestion}
            </p>
          </div>

          {/* Feedback buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60 text-xs">
            <span className="text-[11px] text-slate-400 mr-auto">Feedback sugestie:</span>
            <button
              onClick={() => onUpdateInsightFeedback(aiInsights[0].id, 'useful')}
              className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                aiInsights[0].feedback === 'useful'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <ThumbsUp className="w-3 h-3" /> Util
            </button>
            <button
              onClick={() => onUpdateInsightFeedback(aiInsights[0].id, 'not_useful')}
              className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                aiInsights[0].feedback === 'not_useful'
                  ? 'bg-rose-950 text-rose-300 border border-rose-700'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <ThumbsDown className="w-3 h-3" /> Neutil
            </button>
            <button
              onClick={() => onUpdateInsightFeedback(aiInsights[0].id, 'completed')}
              className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                aiInsights[0].feedback === 'completed'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <Check className="w-3 h-3" /> Finalizat
            </button>
          </div>
        </div>
      )}

      {/* Memorie Longitudinală: Schimbări Detectate 7z vs 30z */}
      {longitudinalShifts.length > 0 && (
        <div className="rounded-xl bg-slate-900/80 border border-cyan-900/40 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Memorie Longitudinală · Schimbări Relevante Recente</span>
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            {longitudinalShifts.map((shift, idx) => (
              <p key={idx} className="leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                {shift}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Sarcini Restante (Outstanding Tasks) */}
      {outstandingTasks.length > 0 && (
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Sarcini restante azi</span>
            <span className="text-amber-400 font-mono">{outstandingTasks.length} de completat</span>
          </div>
          <div className="grid gap-1.5 text-xs text-slate-400">
            {outstandingTasks.map((task, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>{task}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Somn Nocturn (Tier 1 Fundamental) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-950/70 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Somn Nocturn · Tier 1
              </h2>
              <span className="text-[10px] text-slate-400">Țintă protocol: 7–9 ore</span>
            </div>
          </div>
          <button
            onClick={() => setEditingSleep(!editingSleep)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            {editingSleep ? 'Anulează' : 'Modifică'}
          </button>
        </div>

        {editingSleep ? (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Durată (ore)</label>
                <input
                  type="number"
                  step="0.1"
                  min="3"
                  max="14"
                  value={sleepHoursInput}
                  onChange={e => setSleepHoursInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Calitate (1–10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={sleepQualityInput}
                  onChange={e => setSleepQualityInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
            <button
              onClick={handleSaveSleep}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Salvează Somn
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">Durată</span>
              <span className="text-lg font-bold text-white font-mono">
                {dailyLog?.sleepHours ? `${dailyLog.sleepHours}h` : '—'}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                {dailyLog?.sleepHours && dailyLog.sleepHours >= 7 ? 'Optim' : 'Sub 7h'}
              </span>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">Calitate</span>
              <span className="text-lg font-bold text-white font-mono">
                {dailyLog?.sleepQuality ? `${dailyLog.sleepQuality}/10` : '—'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">percepție</span>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">Recuperare</span>
              <span className="text-lg font-bold text-white font-mono">
                {dailyLog?.subjectiveRecovery ? `${dailyLog.subjectiveRecovery}/10` : '8/10'}
              </span>
              <span className="text-[10px] text-cyan-400 block mt-0.5">subiectivă</span>
            </div>
          </div>
        )}
      </div>

      {/* Rutine Matinale și de Seară (Circadian & Hidratare) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Dimineața */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Rutină Dimineață
            </h3>
          </div>

          <div className="space-y-1.5 text-xs">
            <button
              onClick={() =>
                onUpdateDailyLog({
                  morningLightMinutes: dailyLog?.morningLightMinutes ? 0 : 15
                })
              }
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors ${
                (dailyLog?.morningLightMinutes || 0) > 0
                  ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                  : 'bg-slate-950 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>10–20 min lumină naturală</span>
              </div>
              <span className="font-mono text-[11px]">
                {(dailyLog?.morningLightMinutes || 0) > 0 ? '✓ 15m' : '+ Bifează'}
              </span>
            </button>

            <button
              onClick={() =>
                onUpdateDailyLog({
                  morningHydrationDone: !dailyLog?.morningHydrationDone
                })
              }
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors ${
                dailyLog?.morningHydrationDone
                  ? 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
                  : 'bg-slate-950 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>400ml apă + ~1g sare</span>
              </div>
              <span className="font-mono text-[11px]">
                {dailyLog?.morningHydrationDone ? '✓ Luat' : '+ Bifează'}
              </span>
            </button>

            <button
              onClick={() =>
                onUpdateDailyLog({
                  morningCoffeeDone: !dailyLog?.morningCoffeeDone
                })
              }
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors ${
                dailyLog?.morningCoffeeDone
                  ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                  : 'bg-slate-950 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Coffee className="w-3.5 h-3.5 text-amber-500" />
                <span>Cafea (+ Shilajit opțional)</span>
              </div>
              <span className="font-mono text-[11px]">
                {dailyLog?.morningCoffeeDone ? '✓ Consumat' : '+ Bifează'}
              </span>
            </button>
          </div>
        </div>

        {/* Seara */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Rutină Seară (1–2h pre-somn)
            </h3>
          </div>

          <div className="space-y-1.5 text-xs">
            <button
              onClick={() =>
                onUpdateDailyLog({
                  eveningWindDownDone: !dailyLog?.eveningWindDownDone
                })
              }
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors ${
                dailyLog?.eveningWindDownDone
                  ? 'bg-indigo-950/30 border-indigo-800/60 text-indigo-200'
                  : 'bg-slate-950 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Lumină redusă, temp joasă</span>
              </div>
              <span className="font-mono text-[11px]">
                {dailyLog?.eveningWindDownDone ? '✓ Respectat' : '+ Bifează'}
              </span>
            </button>

            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 text-slate-400 flex items-center justify-between">
              <span>Reducerea stimulării / fără ecrane</span>
              <span className="text-[11px] text-cyan-400">Pilon somn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progres Nutriție Rapid (Protein & Fibre) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Nutriție Azi
              </h2>
              <span className="text-[10px] text-slate-400">
                {todayMeals.length} mese logate · {totalCalories} kcal
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('nutrition')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            Jurnal Mese <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Protein bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-300">
              Proteină: <strong className="text-white font-mono">{totalProtein}g</strong> / {proteinTarget.targetGrams}g
            </span>
            <span className="text-emerald-400 font-mono">{proteinPercent}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300 rounded-full"
              style={{ width: `${proteinPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            Protocol: 1.6–2.2 g/kg ({proteinTarget.minGrams}–{proteinTarget.maxGrams} g pentru {userProfile.weightKg} kg)
          </span>
        </div>

        {/* Fibre bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-300">
              Fibre: <strong className="text-white font-mono">{totalFibre}g</strong> / {userProfile.targetFibreG}g
            </span>
            <span className="text-cyan-400 font-mono">{fibrePercent}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${fibrePercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            Protocol: minimum 30 g/zi din alimente integrale & psyllium
          </span>
        </div>
      </div>

      {/* Suplimente Azi (Dimineață & Seara) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Suplimente Programate Azi ({scheduledToday.length})
              </h2>
              <span className="text-[10px] text-slate-400">Conform orarului săptămânal</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('supplements')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            Vezi Protocol <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Dimineața */}
        {morningSupps.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-amber-400 block uppercase tracking-wider">
              Dimineața ({morningSupps.length})
            </span>
            <div className="grid gap-1.5">
              {morningSupps.map(s => {
                const status = getSupplementStatus(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/90 text-xs"
                  >
                    <div>
                      <span className="text-white font-medium block">{s.name}</span>
                      <span className="text-[11px] text-slate-400">{s.doseDescription}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleSupplementIntake(s.id, 'taken')}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          status === 'taken'
                            ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Marchează Luat"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleSupplementIntake(s.id, 'skipped')}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          status === 'skipped'
                            ? 'bg-rose-950 border-rose-700 text-rose-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Marchează Omis"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Seara */}
        {eveningSupps.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-semibold text-indigo-400 block uppercase tracking-wider">
              Seara ({eveningSupps.length})
            </span>
            <div className="grid gap-1.5">
              {eveningSupps.map(s => {
                const status = getSupplementStatus(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/90 text-xs"
                  >
                    <div>
                      <span className="text-white font-medium block">{s.name}</span>
                      <span className="text-[11px] text-slate-400">{s.doseDescription}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleSupplementIntake(s.id, 'taken')}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          status === 'taken'
                            ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Marchează Luat"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleSupplementIntake(s.id, 'skipped')}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          status === 'skipped'
                            ? 'bg-rose-950 border-rose-700 text-rose-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Marchează Omis"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Antrenament Azi (Fitness Pilon Central) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-950/70 border border-orange-800/60 flex items-center justify-center text-orange-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Fitness Azi · Pilon Central
              </h2>
              <span className="text-[10px] text-slate-400">
                {todayWorkouts.length > 0 ? `${todayWorkouts.length} sesiune înregistrată` : 'Niciun antrenament logat'}
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('fitness')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            Adaugă Antrenament <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {todayWorkouts.length > 0 ? (
          <div className="space-y-1.5 text-xs">
            {todayWorkouts.map(w => (
              <div
                key={w.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-white block capitalize">{w.title}</span>
                  <span className="text-[11px] text-slate-400">
                    Tip: {w.type} · {w.durationMinutes} min {w.avgHeartRate ? `· HR mediu ${w.avgHeartRate} bpm` : ''}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono">Finalizat</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-slate-400">
            Forță (3–4×), Zone 2 (2–4×), VO₂max (1×) sau Mobilitate (3–5×)
          </div>
        )}
      </div>
    </div>
  );
};
