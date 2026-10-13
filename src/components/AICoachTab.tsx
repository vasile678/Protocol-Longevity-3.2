import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Check,
  RefreshCw,
  Cpu,
  Lock,
  Eye,
  AlertTriangle,
  Flame,
  Info
} from 'lucide-react';
import {
  AIInsight,
  UserProfile,
  DailyLog,
  MealEntry,
  SupplementIntake,
  WorkoutSession
} from '../types/protocol';

interface AICoachTabProps {
  selectedDate: string;
  userProfile: UserProfile;
  dailyLog?: DailyLog;
  todayMeals: MealEntry[];
  todayIntakes: SupplementIntake[];
  weekWorkouts: WorkoutSession[];
  insights: AIInsight[];
  metrics7d?: any;
  metrics30d?: any;
  longitudinalShifts?: string[];
  onGenerateDeterministic: () => Promise<void>;
  onGenerateGeminiAI: () => Promise<void>;
  onUpdateFeedback: (id: string, feedback: 'useful' | 'not_useful' | 'completed') => Promise<void>;
  onUpdateConsent: (granted: boolean) => Promise<void>;
}

export const AICoachTab: React.FC<AICoachTabProps> = ({
  selectedDate,
  userProfile,
  dailyLog,
  todayMeals,
  todayIntakes,
  weekWorkouts,
  insights,
  metrics7d,
  metrics30d,
  longitudinalShifts = [],
  onGenerateDeterministic,
  onGenerateGeminiAI,
  onUpdateFeedback,
  onUpdateConsent
}) => {
  const [loading, setLoading] = useState(false);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Minimal payload that will be transmitted to Gemini (Privacy-Preserving Minimal Summary)
  const transmittedPayloadPreview = {
    date: selectedDate,
    profile: {
      weightKg: userProfile.weightKg,
      targetProteinGPerKg: userProfile.targetProteinGPerKg,
      targetFibreG: userProfile.targetFibreG,
      fastingTargetHours: userProfile.fastingTargetHours,
      healthGoals: userProfile.healthGoals || []
    },
    dailyLog: dailyLog ? {
      sleepHours: dailyLog.sleepHours,
      sleepQuality: dailyLog.sleepQuality,
      morningLightMinutes: dailyLog.morningLightMinutes,
      morningHydrationDone: dailyLog.morningHydrationDone,
      eveningWindDownDone: dailyLog.eveningWindDownDone
    } : null,
    totalProteinG: Math.round(todayMeals.reduce((s, m) => s + m.protein, 0)),
    totalFibreG: Math.round(todayMeals.reduce((s, m) => s + m.fibre, 0)),
    totalCalories: Math.round(todayMeals.reduce((s, m) => s + m.calories, 0)),
    workoutSessionsThisWeek: weekWorkouts.length,
    supplementsTakenToday: todayIntakes.filter(i => i.status === 'taken').length,
    longitudinalMemorySummary: {
      past7dAverages: metrics7d ? {
        sleepHours: metrics7d.averageSleepHours,
        proteinG: metrics7d.averageProteinG,
        fibreG: metrics7d.averageFibreG,
        supplementAdherencePct: metrics7d.supplementAdherencePct
      } : null,
      past30dAverages: metrics30d ? {
        sleepHours: metrics30d.averageSleepHours,
        proteinG: metrics30d.averageProteinG,
        fibreG: metrics30d.averageFibreG,
        supplementAdherencePct: metrics30d.supplementAdherencePct
      } : null,
      confirmedObservationsCount: 2,
      hypothesesUnderReviewCount: 3
    }
  };

  const handleRunAI = async () => {
    if (!userProfile.aiConsentGranted) {
      setErrorMessage('Trebuie să acorzi consimțământul explicit înainte de a apela motorul Gemini.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await onGenerateGeminiAI();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error?.message || 'Serviciul Gemini live nu este disponibil (mediu static GitHub Pages / offline). A fost activată automat analiza deterministă locală.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDeterministic = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await onGenerateDeterministic();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 pt-2">
      {/* Header & Governance Banner */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AI Coach &amp; Guvernanță
              </h2>
              <p className="text-[11px] text-slate-400">
                Observații bazate pe date reale · Max 3 sugestii prioritizate/zi
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
            {insights.length}/3 Sugestii
          </span>
        </div>

        {/* Clinical Governance Rules */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 text-[11px] text-slate-300 space-y-1 leading-relaxed">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <ShieldCheck className="w-4 h-4" /> Principii de Securitate Clinică
          </div>
          <ul className="list-disc list-inside text-slate-400 space-y-0.5 pl-1">
            <li>Niciun diagnostic, nicio prescripție medicală.</li>
            <li>Nu se alterează independent protocoalele experimentale.</li>
            <li>Separare strictă între observația dovedită și sugestia practică (corelația nu reprezintă cauzalitate).</li>
            <li>Datele lipsă sunt menționate explicit ca factor limitativ.</li>
          </ul>
        </div>

        {/* GitHub Pages & Offline Sovereignty Note */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Arhitectură Client Suveran (GitHub Pages / PWA):</strong> Aplicația funcționează complet fără server Express obligatoriu. Când backend-ul Gemini live nu este disponibil, motorul determinist guvernat rulează 100% local, fără chei API expuse și fără transmitere de date.
          </p>
        </div>
      </div>

      {/* Longitudinal Health Memory Widget */}
      {metrics7d && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Memorie Longitudinală (7 Zile vs 30 Zile)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
              Sinteză Locală
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] text-slate-400 font-sans uppercase block">Media Somn</span>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-300">7z: <strong className="text-white">{metrics7d.averageSleepHours || '—'}h</strong></span>
                <span className="text-slate-400 text-[11px]">30z: {metrics30d?.averageSleepHours || '—'}h</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] text-slate-400 font-sans uppercase block">Proteină Medie</span>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-300">7z: <strong className="text-emerald-300">{metrics7d.averageProteinG || 0}g</strong></span>
                <span className="text-slate-400 text-[11px]">30z: {metrics30d?.averageProteinG || 0}g</span>
              </div>
            </div>
          </div>

          {longitudinalShifts.length > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                Deviații Detectate față de Istoric:
              </span>
              {longitudinalShifts.map((shift, idx) => (
                <p key={idx} className="text-[11px] text-slate-400 leading-relaxed">
                  ● {shift}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explicit Consent & Privacy Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">
                Consimțământ Explicit &amp; Transmitere Date
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Aplicația funcționează complet offline prin reguli deterministe. Pentru apelarea motorului Gemini, este necesar acordul tău explicit.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={userProfile.aiConsentGranted}
              onChange={e => onUpdateConsent(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => setShowPayloadPreview(!showPayloadPreview)}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            {showPayloadPreview ? 'Ascunde Datele Transmise' : 'Arată Ce Date Vor Fi Transmise'}
          </button>
          <span className={`text-[10px] font-mono ${
            userProfile.aiConsentGranted ? 'text-emerald-400' : 'text-slate-400'
          }`}>
            {userProfile.aiConsentGranted ? '✓ Consimțământ Acordat' : 'Offline / Fără Acord'}
          </span>
        </div>

        {/* JSON Preview */}
        {showPayloadPreview && (
          <div className="pt-2">
            <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
              Payload JSON minim sanitizat:
            </span>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-cyan-300 font-mono overflow-x-auto max-h-48">
              {JSON.stringify(transmittedPayloadPreview, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Action Buttons: Gemini vs Deterministic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          disabled={loading || !userProfile.aiConsentGranted}
          onClick={handleRunAI}
          className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-lg ${
            userProfile.aiConsentGranted
              ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-cyan-950'
              : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {loading ? 'Procesare Analiză...' : 'Generează Analiză AI (Gemini)'}
        </button>

        <button
          disabled={loading}
          onClick={handleRunDeterministic}
          className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
        >
          <Cpu className="w-4 h-4 text-cyan-400" />
          Reguli Deterministe (Offline)
        </button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sugestii Prioritizate (Max 3) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Sugestii Active pentru Azi ({insights.length})
          </h3>
          <span className="text-[10px] text-slate-400">
            Ierarhie Tier 1 (Somn, Forță, Nutriție)
          </span>
        </div>

        {insights.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Nicio sugestie generată pentru această zi. Apasă pe unul dintre butoanele de mai sus pentru evaluare.
            </p>
          </div>
        ) : (
          insights.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-300 text-xs font-bold flex items-center justify-center font-mono">
                      {index + 1}
                    </span>
                    <h4 className="font-bold text-sm text-white">{item.title}</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.priority === 'high'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : item.priority === 'medium'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      Prioritate {item.priority === 'high' ? 'Înaltă' : item.priority === 'medium' ? 'Medie' : 'Normală'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                      {item.isDeterministic ? 'Determinist' : 'Gemini AI'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observație (dovada observată) */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dovadă Observată:
                </span>
                <p className="text-slate-300 leading-relaxed">{item.observation}</p>
              </div>

              {/* Sugestie practică */}
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Sugestie Practică Recomandată:
                </span>
                <p className="text-cyan-200 font-medium leading-relaxed">{item.suggestion}</p>
              </div>

              {/* Missing data indicator */}
              {item.missingDataNotes && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 bg-amber-950/20 border border-amber-900/30 p-2 rounded-lg">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Date insuficiente / lipsă: {item.missingDataNotes}</span>
                </div>
              )}

              {/* Feedback buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">Feedback acțiune:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onUpdateFeedback(item.id, 'useful')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                      item.feedback === 'useful'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Util
                  </button>
                  <button
                    onClick={() => onUpdateFeedback(item.id, 'not_useful')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                      item.feedback === 'not_useful'
                        ? 'bg-rose-950 text-rose-300 border border-rose-600'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Neutil
                  </button>
                  <button
                    onClick={() => onUpdateFeedback(item.id, 'completed')}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                      item.feedback === 'completed'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-600'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Finalizat
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
