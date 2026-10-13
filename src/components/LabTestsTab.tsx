import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  Calendar,
  FileText,
  Upload,
  AlertCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Check,
  ChevronRight,
  Info,
  Bell,
  BellOff,
  Sliders,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import {
  BiomarkerDefinition,
  LabResult,
  LabDocument,
  LabResultAlert,
  UserProfile
} from '../types/protocol';
import { formatRomanianDate, formatShortDate } from '../utils/calculations';
import {
  evaluateLabResultAlert,
  isBiomarkerAlertEnabled,
  getActiveAlerts
} from '../utils/labAlertsEngine';

interface LabTestsTabProps {
  selectedDate: string;
  biomarkers: BiomarkerDefinition[];
  results: LabResult[];
  documents: LabDocument[];
  userProfile?: UserProfile;
  onAddLabResult: (result: Omit<LabResult, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteLabResult: (id: string) => Promise<void>;
  onUploadDocument: (doc: Omit<LabDocument, 'id'>) => Promise<string>;
  onToggleBiomarkerAlerts?: (biomarkerId: string, enabled: boolean) => Promise<void>;
  onAcknowledgeAlert?: (resultId: string) => Promise<void>;
}

export const LabTestsTab: React.FC<LabTestsTabProps> = ({
  selectedDate,
  biomarkers,
  results,
  documents,
  userProfile,
  onAddLabResult,
  onDeleteLabResult,
  onUploadDocument,
  onToggleBiomarkerAlerts,
  onAcknowledgeAlert
}) => {
  const [selectedBiomarkerId, setSelectedBiomarkerId] = useState<string>(biomarkers[0]?.id || 'apob');
  const [showAddResultModal, setShowAddResultModal] = useState(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Form states for lab result
  const [testDate, setTestDate] = useState(selectedDate);
  const [testValue, setTestValue] = useState('65');
  const [testUnit, setTestUnit] = useState('mg/dL');
  const [testRefInterval, setTestRefInterval] = useState('< 80 mg/dL');
  const [testLaboratory, setTestLaboratory] = useState('Synevo');
  const [testNotes, setTestNotes] = useState('Recoltare matinală à jeun');
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // Form states for document upload
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadDataUrl, setUploadDataUrl] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState(0);
  const [ocrSimulatedText, setOcrSimulatedText] = useState('');

  const currentBiomarker = biomarkers.find(b => b.id === selectedBiomarkerId) || biomarkers[0];
  const isCurrentBiomarkerAlertsEnabled = isBiomarkerAlertEnabled(currentBiomarker.id, currentBiomarker, userProfile);

  // Filter results for selected biomarker
  const biomarkerResults = results
    .filter(r => r.biomarkerId === currentBiomarker.id)
    .sort((a, b) => a.testDate.localeCompare(b.testDate));

  const latestResult = biomarkerResults[biomarkerResults.length - 1];

  // Evaluate latest alert for current biomarker if not already attached
  const latestAlert: LabResultAlert | undefined = useMemo(() => {
    if (!latestResult) return undefined;
    if (latestResult.alert) return latestResult.alert;
    return evaluateLabResultAlert({
      result: latestResult,
      biomarker: currentBiomarker,
      userProfile
    });
  }, [latestResult, currentBiomarker, userProfile]);

  // Global active alerts across all biomarkers
  const activeAlerts = useMemo(() => {
    return getActiveAlerts(results).filter(a => {
      const bio = biomarkers.find(b => b.id === a.biomarkerId);
      return isBiomarkerAlertEnabled(a.biomarkerId, bio, userProfile);
    });
  }, [results, biomarkers, userProfile]);

  // 6-month cadence monitoring calculation
  const getCadenceCountdown = () => {
    if (results.length === 0) return { days: 0, status: 'Nicio analiză înregistrată încă' };
    const latestDate = results.map(r => r.testDate).sort().reverse()[0];
    const latest = new Date(latestDate);
    const nextDue = new Date(latest);
    nextDue.setMonth(nextDue.getMonth() + 6);

    const now = new Date();
    const diffDays = Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { days: 0, status: 'Analizele la 6 luni sunt scadente acum!' };
    }
    return {
      days: diffDays,
      status: `Următoarea recoltare recomandată în ~${diffDays} zile (${nextDue.toISOString().split('T')[0]})`
    };
  };

  const cadenceInfo = getCadenceCountdown();

  // Live alert preview inside the Add Result Modal
  const liveAlertPreview = useMemo(() => {
    if (!testValue || isNaN(parseFloat(testValue))) return null;
    return evaluateLabResultAlert({
      result: {
        id: 'modal_preview',
        biomarkerId: currentBiomarker.id,
        testDate,
        value: parseFloat(testValue),
        unit: testUnit,
        referenceInterval: testRefInterval,
        laboratory: testLaboratory.trim() || 'Laborator'
      },
      biomarker: currentBiomarker,
      userProfile
    });
  }, [testValue, testUnit, testRefInterval, testLaboratory, currentBiomarker, userProfile, testDate]);

  const handleSaveResult = async () => {
    if (!testValue || isNaN(parseFloat(testValue))) return;

    const val = parseFloat(testValue);
    const newAlert = evaluateLabResultAlert({
      result: {
        id: `lab_temp_${Date.now()}`,
        biomarkerId: currentBiomarker.id,
        testDate,
        value: val,
        unit: testUnit,
        referenceInterval: testRefInterval,
        laboratory: testLaboratory.trim() || 'Laborator',
        notes: testNotes.trim(),
        documentId: selectedDocId || undefined
      },
      biomarker: currentBiomarker,
      userProfile
    });

    await onAddLabResult({
      biomarkerId: currentBiomarker.id,
      testDate,
      value: val,
      unit: testUnit,
      referenceInterval: testRefInterval,
      laboratory: testLaboratory.trim() || 'Laborator',
      notes: testNotes.trim(),
      documentId: selectedDocId || undefined,
      alert: newAlert
    });

    setShowAddResultModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setUploadFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setUploadDataUrl(dataUrl);

      // Simulează extragerea de text pentru confirmare manuală de către utilizator
      const simulatedText = `[Extragere Document: ${file.name}]\n` +
        `Data: ${new Date().toISOString().split('T')[0]}\n` +
        `Parametri detectați:\n` +
        `- ApoB: 62 mg/dL (ref < 80)\n` +
        `- HbA1c: 5.1 % (ref < 5.7)\n` +
        `- Trigliceride: 68 mg/dL (ref < 150)\n` +
        `- hs-CRP: 0.3 mg/L (ref < 1.0)\n` +
        `Confirmă manual fiecare valoare înainte de salvare în baza de date.`;
      setOcrSimulatedText(simulatedText);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocument = async () => {
    if (!uploadFileName) return;

    const newDocId = await onUploadDocument({
      uploadDate: new Date().toISOString().split('T')[0],
      fileName: uploadFileName,
      fileType: uploadFileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      fileSizeBytes: uploadFileSize,
      dataUrl: uploadDataUrl,
      extractedTextPreview: ocrSimulatedText,
      confirmedByUser: true
    });

    setSelectedDocId(newDocId);
    setShowDocUploadModal(false);
  };

  // Chart data
  const chartData = biomarkerResults.map(r => ({
    date: r.testDate,
    valoare: r.value,
    unit: r.unit
  }));

  const renderBadge = (alert?: LabResultAlert, alertsActive: boolean = true) => {
    if (!alert) return null;

    const mutedBadge = !alertsActive ? (
      <span className="inline-flex items-center gap-0.5 ml-1 opacity-75 text-[9px]" title="Notificările sunt oprite în preferințe">
        <BellOff className="w-2.5 h-2.5" />
      </span>
    ) : null;

    switch (alert.severity) {
      case 'valoare_critica':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-200 border border-rose-600 animate-pulse shadow-sm shadow-rose-950">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            {alert.direction === 'high' ? '↑' : '↓'} Valoare critică
            {mutedBadge}
          </span>
        );
      case 'evaluare_medicala':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-200 border border-amber-600">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            {alert.direction === 'high' ? '↑ Peste interval' : alert.direction === 'low' ? '↓ Sub interval' : 'Evaluare medicală'}
            {mutedBadge}
          </span>
        );
      case 'abatere_usoara':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-950/60 text-yellow-300 border border-yellow-700/60">
            <Info className="w-3 h-3 text-yellow-400" />
            {alert.direction === 'high' ? '↑ Peste optim' : '↓ Sub optim'}
            {mutedBadge}
          </span>
        );
      case 'unitate_incompatibila':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-950/80 text-purple-200 border border-purple-600">
            <AlertCircle className="w-3 h-3 text-purple-400" /> Unitate incompatibilă
            {mutedBadge}
          </span>
        );
      case 'interval_lipsa':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Info className="w-3 h-3 text-slate-400" /> Interval nespecificat
            {mutedBadge}
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800">
            <Check className="w-3 h-3 text-emerald-400" /> În interval optim
            {mutedBadge}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 pt-2">
      {/* Header & 6-Month Cadence Card */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Analize Laborator · Cadenta 6 Luni
            </h2>
            <p className="text-[11px] text-slate-400">
              Protocol Longevity 3.2 · Sistem de Alerte Medicale Governat
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              title="Configurare Alerte Biomarkeri"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Alerte
            </button>
            <button
              onClick={() => setShowDocUploadModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" /> Buletin PDF
            </button>
            <button
              onClick={() => {
                setTestUnit(currentBiomarker.unit);
                setTestRefInterval(''); // Gol implicit conform cerinței (nu precompleta cu ținta de longevitate)
                setShowAddResultModal(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adaugă Rezultat
            </button>
          </div>
        </div>

        {/* 6-Month Countdown Banner */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-300 font-medium">{cadenceInfo.status}</span>
          </div>
          {results.length > 0 && (
            <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
              {results.length} măsurători
            </span>
          )}
        </div>
      </div>

      {/* Global Alerts Summary Strip (if any active alerts) */}
      {activeAlerts.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-200">
                Alerte Analize Laborator Active ({activeAlerts.length})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Verificate local · Fără transfer extern
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {activeAlerts.map(alt => (
              <button
                key={alt.id}
                onClick={() => setSelectedBiomarkerId(alt.biomarkerId)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border flex items-center gap-1.5 shrink-0 transition-colors ${
                  alt.severity === 'valoare_critica'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-200 hover:bg-rose-900'
                    : alt.severity === 'evaluare_medicala'
                    ? 'bg-amber-950/60 border-amber-600/80 text-amber-200 hover:bg-amber-900/60'
                    : 'bg-yellow-950/40 border-yellow-700/50 text-yellow-300 hover:bg-yellow-900/40'
                }`}
              >
                <span className="font-bold">{alt.biomarkerCode}:</span>
                <span>{alt.value} {alt.unit}</span>
                <span className="text-[9px] uppercase font-mono opacity-80">
                  ({alt.direction === 'high' ? '↑' : alt.direction === 'low' ? '↓' : '!'})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Biomarker Selector Scroll Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Selectează Biomarker din Protocol
          </span>
          <span className="text-[10px] text-slate-500">
            {biomarkers.length} biomarkeri monitorizați
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {biomarkers.map(b => {
            const isSelected = b.id === currentBiomarker.id;
            const bResults = results.filter(r => r.biomarkerId === b.id);
            const latest = bResults[bResults.length - 1];
            const alertsOn = isBiomarkerAlertEnabled(b.id, b, userProfile);

            return (
              <button
                key={b.id}
                onClick={() => setSelectedBiomarkerId(b.id)}
                className={`p-2.5 rounded-xl border text-left shrink-0 min-w-[136px] transition-all relative ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-600 text-white shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">{b.code}</span>
                    {!alertsOn && (
                      <span title="Alerte dezactivate">
                        <BellOff className="w-2.5 h-2.5 text-slate-500" />
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-mono uppercase ${
                    b.tier === 'core' ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {b.tier}
                  </span>
                </div>
                <div className="text-[11px] font-mono flex items-center justify-between">
                  {latest ? (
                    <>
                      <span className="font-bold text-white">
                        {latest.value} <span className="text-[9px] text-slate-400">{latest.unit}</span>
                      </span>
                      {latest.alert && alertsOn && (
                        <span className="text-[9px]">
                          {latest.alert.severity === 'valoare_critica' && '🚨'}
                          {latest.alert.severity === 'evaluare_medicala' && (latest.alert.direction === 'high' ? '🔺' : '🔻')}
                          {latest.alert.severity === 'abatere_usoara' && '🟡'}
                          {latest.alert.severity === 'normal' && '🟢'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500 text-[10px]">fără date</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Biomarker Detail & Active Alert Banner */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3.5">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">{currentBiomarker.name}</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                currentBiomarker.tier === 'core'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {currentBiomarker.tier === 'core' ? 'Tier Core' : 'Opțional'}
              </span>
              {renderBadge(latestAlert, isCurrentBiomarkerAlertsEnabled)}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {currentBiomarker.rationale}
            </p>
          </div>

          {/* Toggle Alert button for current biomarker */}
          <button
            onClick={() => onToggleBiomarkerAlerts?.(currentBiomarker.id, !isCurrentBiomarkerAlertsEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
              isCurrentBiomarkerAlertsEnabled
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {isCurrentBiomarkerAlertsEnabled ? (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                <span>Alerte Active</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Alerte Oprite</span>
              </>
            )}
          </button>
        </div>

        {/* Detailed Clinical Alert Card if latest result is abnormal and alerts enabled */}
        {latestAlert && isCurrentBiomarkerAlertsEnabled && latestAlert.severity !== 'normal' && (
          <div className={`p-3.5 rounded-xl border space-y-2 text-xs leading-relaxed ${
            latestAlert.severity === 'valoare_critica'
              ? 'bg-rose-950/60 border-rose-600 text-rose-200'
              : latestAlert.severity === 'evaluare_medicala'
              ? 'bg-amber-950/50 border-amber-600/70 text-amber-200'
              : latestAlert.severity === 'unitate_incompatibila'
              ? 'bg-purple-950/50 border-purple-600/70 text-purple-200'
              : latestAlert.severity === 'interval_lipsa'
              ? 'bg-slate-950 border-slate-700 text-slate-300'
              : 'bg-yellow-950/40 border-yellow-700/60 text-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {latestAlert.severity === 'valoare_critica' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                ) : latestAlert.severity === 'evaluare_medicala' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-yellow-400 shrink-0" />
                )}
                <span className="font-bold text-white text-xs">{latestAlert.title}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">
                {latestAlert.referenceUsed}
              </span>
            </div>

            <p className="text-[11px] opacity-95">
              {latestAlert.message}
            </p>

            {latestAlert.clinicalGuidance && (
              <div className="pt-1 border-t border-slate-800/80 text-[11px] flex items-start gap-1.5 text-slate-300">
                <span className="font-semibold text-cyan-300 shrink-0">Indicație clinică:</span>
                <span>{latestAlert.clinicalGuidance}</span>
              </div>
            )}

            <div className="pt-1 text-[10px] text-slate-400 italic">
              ℹ️ Protocolul nu ajustează automat suplimentele sau dozele. Consultă medicul curant.
            </div>
          </div>
        )}

        {/* Reference ranges - Separare strictă (Cerința 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-cyan-400 uppercase font-sans block font-semibold">
              Interval Buletin Laborator
            </span>
            <span className="text-xs font-bold text-slate-200 block truncate">
              {latestResult?.referenceInterval ? latestResult.referenceInterval : 'Nespecificat pe buletin'}
            </span>
            <span className="text-[9px] text-slate-500 font-sans block">
              {latestResult?.laboratory ? `Sursă: ${latestResult.laboratory}` : 'Folosește fallback clinic'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-sans block font-semibold">
              Interval Clinic Fallback
            </span>
            <span className="text-xs font-bold text-slate-300 block">
              {currentBiomarker.clinicalRefMin !== undefined ? `${currentBiomarker.clinicalRefMin} – ` : ''}
              {currentBiomarker.clinicalRefMax ?? '—'} {currentBiomarker.unit}
            </span>
            <span className="text-[9px] text-slate-500 font-sans block">
              Ghid clinic standard de referință
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-900/50">
            <span className="text-[10px] text-emerald-400 uppercase font-sans block font-semibold">
              Țintă Personală Longevity 3.2
            </span>
            <span className="text-xs font-bold text-emerald-300 block">
              {currentBiomarker.optimalMin !== undefined ? `${currentBiomarker.optimalMin} – ` : ''}
              {currentBiomarker.optimalMax ?? '—'} {currentBiomarker.unit}
            </span>
            <span className="text-[9px] text-emerald-500/80 font-sans block">
              Țintă optimă (nu limită de laborator)
            </span>
          </div>
        </div>

        {/* Trend Chart (Recharts) */}
        {chartData.length > 0 ? (
          <div className="space-y-1 pt-2">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">
              Evoluție Longitudinală
            </span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      fontSize: '11px'
                    }}
                  />
                  {currentBiomarker.optimalMax && (
                    <ReferenceLine
                      y={currentBiomarker.optimalMax}
                      stroke="#10b981"
                      strokeDasharray="3 3"
                      label={{ value: 'Prag Optim', fill: '#10b981', fontSize: 10 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="valoare"
                    name={`${currentBiomarker.code} (${currentBiomarker.unit})`}
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#06b6d4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-950 text-center text-xs text-slate-400">
            Niciun rezultat salvat pentru acest biomarker. Apasă pe „Adaugă Rezultat” pentru a introduce prima valoare.
          </div>
        )}
      </div>

      {/* Istoric Rezultate Înregistrate cu Indicatori sub/peste interval */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Măsurători Înregistrate ({biomarkerResults.length})
          </h3>
          <span className="text-[10px] text-slate-400">
            {isCurrentBiomarkerAlertsEnabled ? 'Alerte active' : 'Alerte oprite'}
          </span>
        </div>

        <div className="space-y-2">
          {biomarkerResults.map(res => {
            const resAlert = res.alert || evaluateLabResultAlert({
              result: res,
              biomarker: currentBiomarker,
              userProfile
            });

            return (
              <div
                key={res.id}
                className={`p-3 rounded-2xl bg-slate-900/80 border text-xs transition-all ${
                  resAlert.severity === 'valoare_critica' && isCurrentBiomarkerAlertsEnabled
                    ? 'border-rose-700/80 shadow-md shadow-rose-950/40'
                    : resAlert.severity === 'evaluare_medicala' && isCurrentBiomarkerAlertsEnabled
                    ? 'border-amber-700/70'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white font-mono text-sm">
                        {res.value} {res.unit}
                      </span>
                      <span className="text-[11px] text-slate-400">· {res.testDate}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {res.laboratory}
                      </span>
                      {renderBadge(resAlert, isCurrentBiomarkerAlertsEnabled)}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>Ref laborator: <span className="text-slate-300 font-mono">{res.referenceInterval}</span></span>
                      {resAlert.direction === 'high' && (
                        <span className="text-rose-400 font-semibold flex items-center gap-0.5 text-[10px]">
                          <ArrowUp className="w-3 h-3" /> Peste interval
                        </span>
                      )}
                      {resAlert.direction === 'low' && (
                        <span className="text-cyan-400 font-semibold flex items-center gap-0.5 text-[10px]">
                          <ArrowDown className="w-3 h-3" /> Sub interval
                        </span>
                      )}
                    </div>

                    {resAlert.message && resAlert.severity !== 'normal' && isCurrentBiomarkerAlertsEnabled && (
                      <p className="text-[11px] text-slate-300 pt-0.5">
                        {resAlert.message}
                      </p>
                    )}

                    {res.notes && (
                      <p className="text-[11px] text-slate-400 pt-0.5 italic">Note: {res.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteLabResult(res.id)}
                    className="text-slate-400 hover:text-rose-400 p-2 rounded transition-colors shrink-0"
                    title="Șterge rezultat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documente Încărcate (PDF / Imagini salvate local) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Fișiere Laborator Stocate Privat pe Dispozitiv ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
            Niciun buletin PDF încărcat încă. Documentele sunt salvate strict în memoria privată a dispozitivului.
          </div>
        ) : (
          <div className="grid gap-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-semibold text-white block">{doc.fileName}</span>
                    <span className="text-[10px] text-slate-400">
                      Încărcat: {doc.uploadDate} · {Math.round(doc.fileSizeBytes / 1024)} KB
                    </span>
                  </div>
                </div>
                {doc.dataUrl && (
                  <a
                    href={doc.dataUrl}
                    download={doc.fileName}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    Descarcă
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Configurare & Dezactivare Alerte per Biomarker */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Configurare Alerte Biomarkeri
                </h3>
                <p className="text-[11px] text-slate-400">
                  Activează sau dezactivează alertele individual pentru fiecare analiză
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confidențialitate &amp; Reguli Clinice:
              </div>
              <p className="text-slate-400 leading-relaxed">
                Alertele sunt evaluate strict offline pe dispozitiv. Sistemul nu transmite date medicale extern și nu modifică automat protocolul sau suplimentele.
              </p>
            </div>

            <div className="space-y-2">
              {biomarkers.map(b => {
                const isEnabled = isBiomarkerAlertEnabled(b.id, b, userProfile);
                return (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{b.code}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({b.unit})</span>
                        <span className={`text-[9px] uppercase px-1.5 rounded ${
                          b.tier === 'core' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {b.tier}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {b.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Optim: {b.optimalMin ?? 0}–{b.optimalMax ?? '—'} · Clinic: {b.clinicalRefMin ?? 0}–{b.clinicalRefMax ?? '—'}
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleBiomarkerAlerts?.(b.id, !isEnabled)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        isEnabled
                          ? 'bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                          : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {isEnabled ? (
                        <>
                          <Bell className="w-3 h-3 text-emerald-400" />
                          <span>Activ</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="w-3 h-3 text-slate-500" />
                          <span>Dezactivat</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
            >
              Închide Configurare
            </button>
          </div>
        </div>
      )}

      {/* Modal Adăugare Rezultat cu Live Preview Alertă */}
      {showAddResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Adaugă Rezultat: {currentBiomarker.name}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Data Recoltării</label>
                <input
                  type="date"
                  value={testDate}
                  onChange={e => setTestDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Valoare Rezultat</label>
                  <input
                    type="number"
                    step="0.01"
                    value={testValue}
                    onChange={e => setTestValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unitate de Măsură</label>
                  <input
                    type="text"
                    value={testUnit}
                    onChange={e => setTestUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 block">Interval Referință Laborator</label>
                  <span className="text-[10px] text-slate-500 font-mono">Exclusiv din buletin</span>
                </div>
                <input
                  type="text"
                  value={testRefInterval}
                  onChange={e => setTestRefInterval(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                  placeholder="Lasă gol sau introdu intervalul din buletin (ex: < 100 sau 40 - 100)"
                />
                <div className="mt-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] space-y-1">
                  <div className="text-slate-400">
                    <span className="text-slate-500 font-medium">Interval clinic fallback: </span>
                    <span className="text-slate-300 font-mono">
                      {currentBiomarker.clinicalRefMin !== undefined ? `${currentBiomarker.clinicalRefMin} – ` : ''}
                      {currentBiomarker.clinicalRefMax ?? '—'} {currentBiomarker.unit}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-emerald-400/80 font-medium">Țintă personală Longevity 3.2: </span>
                    <span className="text-emerald-300 font-mono">
                      {currentBiomarker.optimalMin !== undefined ? `${currentBiomarker.optimalMin} – ` : ''}
                      {currentBiomarker.optimalMax ?? '—'} {currentBiomarker.unit}
                    </span>
                    <span className="text-slate-500 ml-1">(optim personal, nu limită de laborator)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Laborator (Synevo, Regina Maria etc.)</label>
                <input
                  type="text"
                  value={testLaboratory}
                  onChange={e => setTestLaboratory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Previzualizare Live Alertă */}
              {liveAlertPreview && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Previzualizare Alertă:</span>
                    {renderBadge(liveAlertPreview, isCurrentBiomarkerAlertsEnabled)}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {liveAlertPreview.message}
                  </p>
                  {liveAlertPreview.clinicalGuidance && (
                    <p className="text-[10px] text-cyan-300 italic">
                      {liveAlertPreview.clinicalGuidance}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Note clinice</label>
                <textarea
                  rows={2}
                  value={testNotes}
                  onChange={e => setTestNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddResultModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveResult}
                className="w-1/2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Salvează Rezultat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Încărcare Buletin PDF cu Confirmare Manuală */}
      {showDocUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Încărcare Document Analize (PDF / Poză)
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Fișierele rămân stocate strict local în IndexedDB, garantând confidențialitatea datelor medicale.
              </p>

              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                className="w-full text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900"
              />

              {ocrSimulatedText && (
                <div className="space-y-1 pt-1">
                  <label className="text-slate-400 block font-semibold">Previzualizare și confirmare manuală:</label>
                  <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {ocrSimulatedText}
                  </pre>
                  <span className="text-[10px] text-amber-400 block">
                    ⚠️ Verifică întotdeauna rezultatele extrase cu buletinul original.
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDocUploadModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Anulează
              </button>
              <button
                disabled={!uploadFileName}
                onClick={handleSaveDocument}
                className="w-1/2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Confirmă &amp; Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
