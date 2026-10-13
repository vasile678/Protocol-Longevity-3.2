import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Layers,
  Edit2,
  Clock,
  Sparkles,
  Info,
  HelpCircle,
  Check,
  Package,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import {
  SupplementDefinition,
  SupplementIntake,
  UserProfile,
  SupplementIntakeStatus,
  SupplementProductVersion
} from '../types/protocol';
import {
  isSupplementScheduledForDate,
  calculateExperimentalCycle,
  getWeekdayAbbr,
  formatRomanianDate
} from '../utils/calculations';
import { ReplaceBrandModal } from './ReplaceBrandModal';
import { ReplaceBrandParams } from '../db';

interface SupplementsTabProps {
  selectedDate: string;
  userProfile: UserProfile;
  supplements: SupplementDefinition[];
  supplementProducts?: SupplementProductVersion[];
  intakes: SupplementIntake[];
  onToggleIntake: (supplementId: string, status: 'taken' | 'skipped') => Promise<void>;
  onUpdateSupplement: (supp: SupplementDefinition) => Promise<void>;
  onReplaceBrand: (params: ReplaceBrandParams) => Promise<void>;
  onUpdateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export const SupplementsTab: React.FC<SupplementsTabProps> = ({
  selectedDate,
  userProfile,
  supplements,
  supplementProducts = [],
  intakes,
  onToggleIntake,
  onUpdateSupplement,
  onReplaceBrand,
  onUpdateUserProfile
}) => {
  const [filterTier, setFilterTier] = useState<'all' | 'support' | 'experimental'>('all');
  const [editingSupplement, setEditingSupplement] = useState<SupplementDefinition | null>(null);
  const [replacingSupplement, setReplacingSupplement] = useState<SupplementDefinition | null>(null);

  const targetDateObj = new Date(selectedDate);
  const cycleInfo = calculateExperimentalCycle(
    userProfile.tier3CycleStartDate,
    targetDateObj,
    userProfile.tier3WeeksOn,
    userProfile.tier3WeeksOff
  );

  const getStatus = (suppId: string): SupplementIntakeStatus | 'pending' => {
    const intake = intakes.find(i => i.supplementId === suppId);
    return intake?.status || 'pending';
  };

  const filteredSupplements = supplements.filter(s => {
    if (filterTier === 'all') return true;
    return s.tier === filterTier;
  });

  const morningSupps = filteredSupplements.filter(s => s.timing === 'dimineata');
  const eveningSupps = filteredSupplements.filter(s => s.timing === 'seara');

  const handleSaveEdit = async () => {
    if (!editingSupplement) return;
    await onUpdateSupplement(editingSupplement);
    setEditingSupplement(null);
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 pt-2">
      {/* Header & Governance Banner */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Suplimente · Protocol Longevity 3.2
            </h2>
            <p className="text-[11px] text-slate-400">
              Data selectată: <span className="text-cyan-400 font-medium capitalize">{formatRomanianDate(selectedDate)}</span>
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-slate-950 px-2 py-1 rounded border border-slate-800">
            {supplements.length} Intervenții
          </span>
        </div>

        {/* Safety Disclaimer */}
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-900/60 flex items-start gap-2.5 text-[11px] text-amber-200/90 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 font-semibold">Regulă de Guvernanță: </strong>
            Protocolul este informație deținută de utilizator, nu recomandare medicală automată. Nu se recomandă începerea, creșterea sau combinarea automată a intervențiilor fără monitorizare de specialitate.
          </div>
        </div>
      </div>

      {/* Experimental Tier 3 Cycling Card */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-800/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Ciclare Tier 3 Experimental (8s ON → 2s OFF)
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            cycleInfo.phase === 'ON'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-amber-950 text-amber-300 border border-amber-800'
          }`}>
            Faza {cycleInfo.phase} (Ciclu #{cycleInfo.cycleIndex})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase font-sans block">Săptămână</span>
            <span className="text-base font-bold text-white">
              {cycleInfo.currentWeekInPhase} / {cycleInfo.totalWeeksInPhase}
            </span>
            <span className="text-[9px] text-slate-400 block font-sans">în faza curentă</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase font-sans block">Zile Rămase</span>
            <span className="text-base font-bold text-cyan-300">{cycleInfo.daysRemainingInPhase}</span>
            <span className="text-[9px] text-slate-400 block font-sans">până la switch</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase font-sans block">Următoarea Fază</span>
            <span className="text-xs font-bold text-purple-300 truncate mt-1 block">
              {cycleInfo.nextPhaseStartDate}
            </span>
            <span className="text-[9px] text-slate-400 block font-sans">
              {cycleInfo.phase === 'ON' ? 'Pauză OFF' : 'Reluare ON'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Progres faza {cycleInfo.phase}</span>
            <span className="font-mono text-purple-300">{cycleInfo.progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                cycleInfo.phase === 'ON'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500'
              }`}
              style={{ width: `${cycleInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ambiguity Resolution Card (Citicoline & Scope) */}
      <div className="rounded-2xl bg-slate-900/90 border border-cyan-900/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Rezolvare Ambiguități Text Sursă
          </h3>
        </div>

        <div className="space-y-2 text-xs">
          {/* Citicoline Discrepancy */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-semibold text-white block">Citicolină: Orar Săptămânal</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Secțiunea 5 specifică <strong>L/M/V</strong> (Luni/Miercuri/Vineri), în timp ce Secțiunea 10 menționează <strong>L/M/J</strong> (Luni/Miercuri/Joi).
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onUpdateUserProfile({ citicolineWeekdaySchedule: 'LMV' })}
                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  userProfile.citicolineWeekdaySchedule === 'LMV'
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Urmează L/M/V (Secț. 5) {userProfile.citicolineWeekdaySchedule === 'LMV' && '✓'}
              </button>
              <button
                onClick={() => onUpdateUserProfile({ citicolineWeekdaySchedule: 'LMJ' })}
                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  userProfile.citicolineWeekdaySchedule === 'LMJ'
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Urmează L/M/J (Secț. 10) {userProfile.citicolineWeekdaySchedule === 'LMJ' && '✓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium">
        <button
          onClick={() => setFilterTier('all')}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filterTier === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Toate ({supplements.length})
        </button>
        <button
          onClick={() => setFilterTier('support')}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filterTier === 'support' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Tier 2 Support ({supplements.filter(s => s.tier === 'support').length})
        </button>
        <button
          onClick={() => setFilterTier('experimental')}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            filterTier === 'experimental' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Tier 3 Experimental ({supplements.filter(s => s.tier === 'experimental').length})
        </button>
      </div>

      {/* Suplimente Dimineața */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Dimineața ({morningSupps.length})
          </span>
          <span className="text-[10px] text-slate-400">Imediat după trezire / la cafea</span>
        </div>

        <div className="grid gap-2">
          {morningSupps.map(supp => {
            const isScheduledToday = isSupplementScheduledForDate(
              supp,
              targetDateObj,
              userProfile.citicolineWeekdaySchedule
            );
            const status = getStatus(supp.id);

            return (
              <div
                key={supp.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isScheduledToday
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-slate-950/60 border-slate-900 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{supp.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        supp.tier === 'experimental'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                          : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                      }`}>
                        {supp.tierLabel}
                      </span>
                      {supp.isCycling && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Ciclare 8s ON / 2s OFF
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-300 font-mono">
                      Doză: {supp.doseDescription}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {supp.governanceNote}
                    </p>

                    {supp.reviewWarning && (
                      <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[10px] text-amber-300">
                        ⚠️ {supp.reviewWarning}
                      </div>
                    )}

                    {/* Active Brand & Product Snapshot */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                        <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Brand curent: <strong className="text-white">{supp.currentBrandName || 'Brand de bază (Protocol 3.2)'}</strong></span>
                        {supp.currentProductName && supp.currentProductName !== supp.name && (
                          <span className="text-slate-400">({supp.currentProductName})</span>
                        )}
                      </div>

                      {supp.currentPhotoDataUrl && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-cyan-300">
                          <ImageIcon className="w-3 h-3 text-cyan-400" />
                          <span>Foto etichetă</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setReplacingSupplement(supp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-700/60 text-cyan-200 text-[11px] font-semibold transition-colors shadow-sm"
                        title="Înlocuiește produsul / brandul curent cu arhivarea istoricului"
                      >
                        <RefreshCw className="w-3 h-3 text-cyan-400" />
                        <span>Înlocuiește brandul</span>
                      </button>
                    </div>

                    {supp.concentrationReviewFlag && (
                      <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[10px] text-amber-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>{supp.concentrationReviewFlag}</span>
                      </div>
                    )}

                    {/* Scheduled Days Badges */}
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] text-slate-400 mr-1">Zile:</span>
                      {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
                        const isDayActive = supp.id === 'citicoline'
                          ? (userProfile.citicolineWeekdaySchedule === 'LMJ' ? [1, 3, 4].includes(dayIndex) : [1, 3, 5].includes(dayIndex))
                          : supp.scheduledDays.includes(dayIndex);
                        const isSelectedCurrentDay = targetDateObj.getDay() === dayIndex;

                        return (
                          <span
                            key={dayIndex}
                            className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-mono ${
                              isDayActive
                                ? isSelectedCurrentDay
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-800 text-cyan-300'
                                : 'bg-slate-950 text-slate-400'
                            }`}
                          >
                            {getWeekdayAbbr(dayIndex)}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingSupplement(supp)}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                      title="Editează orar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {isScheduledToday ? (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => onToggleIntake(supp.id, 'taken')}
                          className={`p-2 rounded-xl border transition-colors ${
                            status === 'taken'
                              ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Marchează Luat"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleIntake(supp.id, 'skipped')}
                          className={`p-2 rounded-xl border transition-colors ${
                            status === 'skipped'
                              ? 'bg-rose-950 border-rose-600 text-rose-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Marchează Omis"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono mt-1">
                        Neplanificat azi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suplimente Seara */}
      <div className="space-y-3 pt-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Seara ({eveningSupps.length})
          </span>
          <span className="text-[10px] text-slate-400">Cu 1–2 ore înainte de somn</span>
        </div>

        <div className="grid gap-2">
          {eveningSupps.map(supp => {
            const isScheduledToday = isSupplementScheduledForDate(supp, targetDateObj);
            const status = getStatus(supp.id);

            return (
              <div
                key={supp.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isScheduledToday
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-slate-950/60 border-slate-900 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{supp.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                        {supp.tierLabel}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-mono">
                      Doză: {supp.doseDescription}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {supp.governanceNote}
                    </p>

                    {supp.reviewWarning && (
                      <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[10px] text-amber-300">
                        ⚠️ {supp.reviewWarning}
                      </div>
                    )}

                    {/* Active Brand & Product Snapshot */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                        <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Brand curent: <strong className="text-white">{supp.currentBrandName || 'Brand de bază (Protocol 3.2)'}</strong></span>
                        {supp.currentProductName && supp.currentProductName !== supp.name && (
                          <span className="text-slate-400">({supp.currentProductName})</span>
                        )}
                      </div>

                      {supp.currentPhotoDataUrl && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-cyan-300">
                          <ImageIcon className="w-3 h-3 text-cyan-400" />
                          <span>Foto etichetă</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setReplacingSupplement(supp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-700/60 text-cyan-200 text-[11px] font-semibold transition-colors shadow-sm"
                        title="Înlocuiește produsul / brandul curent cu arhivarea istoricului"
                      >
                        <RefreshCw className="w-3 h-3 text-cyan-400" />
                        <span>Înlocuiește brandul</span>
                      </button>
                    </div>

                    {supp.concentrationReviewFlag && (
                      <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[10px] text-amber-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>{supp.concentrationReviewFlag}</span>
                      </div>
                    )}

                    {/* Scheduled Days Badges */}
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] text-slate-400 mr-1">Zile:</span>
                      {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
                        const isDayActive = supp.scheduledDays.includes(dayIndex);
                        const isSelectedCurrentDay = targetDateObj.getDay() === dayIndex;

                        return (
                          <span
                            key={dayIndex}
                            className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-mono ${
                              isDayActive
                                ? isSelectedCurrentDay
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-800 text-cyan-300'
                                : 'bg-slate-950 text-slate-400'
                            }`}
                          >
                            {getWeekdayAbbr(dayIndex)}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingSupplement(supp)}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                      title="Editează orar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {isScheduledToday ? (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => onToggleIntake(supp.id, 'taken')}
                          className={`p-2 rounded-xl border transition-colors ${
                            status === 'taken'
                              ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Marchează Luat"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleIntake(supp.id, 'skipped')}
                          className={`p-2 rounded-xl border transition-colors ${
                            status === 'skipped'
                              ? 'bg-rose-950 border-rose-600 text-rose-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Marchează Omis"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono mt-1">
                        Neplanificat azi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Editare Supliment */}
      {editingSupplement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Editează Supliment: {editingSupplement.name}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Doză descriere</label>
                <input
                  type="text"
                  value={editingSupplement.doseDescription}
                  onChange={e =>
                    setEditingSupplement({
                      ...editingSupplement,
                      doseDescription: e.target.value
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Moment administrare</label>
                <select
                  value={editingSupplement.timing}
                  onChange={e =>
                    setEditingSupplement({
                      ...editingSupplement,
                      timing: e.target.value as any
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="dimineata">Dimineața (imediat / la cafea)</option>
                  <option value="seara">Seara (1–2h înainte de somn)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Zile programate</label>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 0].map(day => {
                    const isSelected = editingSupplement.scheduledDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const newDays = isSelected
                            ? editingSupplement.scheduledDays.filter(d => d !== day)
                            : [...editingSupplement.scheduledDays, day];
                          setEditingSupplement({
                            ...editingSupplement,
                            scheduledDays: newDays
                          });
                        }}
                        className={`py-1.5 rounded text-xs font-mono font-medium ${
                          isSelected
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {getWeekdayAbbr(day)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notă Guvernanță</label>
                <textarea
                  rows={2}
                  value={editingSupplement.governanceNote}
                  onChange={e =>
                    setEditingSupplement({
                      ...editingSupplement,
                      governanceNote: e.target.value
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingSupplement(null)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveEdit}
                className="w-1/2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Salvează Modificări
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Brand Modal */}
      {replacingSupplement && (
        <ReplaceBrandModal
          isOpen={!!replacingSupplement}
          onClose={() => setReplacingSupplement(null)}
          supplement={replacingSupplement}
          activeProduct={supplementProducts.find(
            p => p.supplementId === replacingSupplement.id && !p.isArchived
          )}
          archivedProducts={supplementProducts.filter(
            p => p.supplementId === replacingSupplement.id && p.isArchived
          )}
          onConfirmReplace={onReplaceBrand}
        />
      )}
    </div>
  );
};
