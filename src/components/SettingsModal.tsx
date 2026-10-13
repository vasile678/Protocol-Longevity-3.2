import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  Save,
  Check,
  Shield,
  Trash2,
  Database,
  HardDrive,
  FileCheck,
  Sliders,
  Plus,
  Target,
  Clock
} from 'lucide-react';
import { UserProfile, ExportBackupPayload, ProtocolAdjustment } from '../types/protocol';
import {
  exportAllData,
  importDataPayload,
  encryptBackupWithPassword,
  decryptAndRestoreWithPassword,
  verifyPersistence,
  getRecordCounts,
  getStorageEstimate,
  verifyBackupIntegrity,
  deleteSelectedRecords,
  wipeAllData
} from '../db';

interface SettingsModalProps {
  userProfile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  onReloadAllData: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  userProfile,
  isOpen,
  onClose,
  onUpdateProfile,
  onReloadAllData
}) => {
  const [activeTab, setActiveTab] = useState<'context' | 'memory'>('context');

  // Form states for Personal Context & Targets
  const [userName, setUserName] = useState(userProfile.name || 'Utilizator Longevity');
  const [weightKg, setWeightKg] = useState(userProfile.weightKg.toString());
  const [proteinFactor, setProteinFactor] = useState(userProfile.targetProteinGPerKg.toString());
  const [fibreTarget, setFibreTarget] = useState(userProfile.targetFibreG.toString());
  const [fastingHours, setFastingHours] = useState(userProfile.fastingTargetHours.toString());
  const [citicolineSched, setCiticolineSched] = useState(userProfile.citicolineWeekdaySchedule);
  const [cycleStartDate, setCycleStartDate] = useState(userProfile.tier3CycleStartDate);
  const [retentionDays, setRetentionDays] = useState((userProfile.dataRetentionDays ?? 0).toString());

  // Goals & Preferences list states
  const [healthGoals, setHealthGoals] = useState<string[]>(userProfile.healthGoals || []);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>(userProfile.dietaryPreferences || []);
  const [newDietaryInput, setNewDietaryInput] = useState('');

  // Fitness targets
  const [targetStrength, setTargetStrength] = useState((userProfile.fitnessTargets?.weeklyStrengthSessions ?? 3).toString());
  const [targetZone2Min, setTargetZone2Min] = useState((userProfile.fitnessTargets?.weeklyZone2Minutes ?? 120).toString());
  const [targetVo2Max, setTargetVo2Max] = useState((userProfile.fitnessTargets?.weeklyVo2MaxSessions ?? 1).toString());
  const [targetMobility, setTargetMobility] = useState((userProfile.fitnessTargets?.weeklyMobilitySessions ?? 3).toString());

  // Memory & Storage stats
  const [storageStats, setStorageStats] = useState<{ usageFormatted: string; totalRecords: number; lastSaved: string; isOpen: boolean }>({
    usageFormatted: '—',
    totalRecords: 0,
    lastSaved: '',
    isOpen: true
  });
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});

  // Encryption & Backup states
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [integrityReport, setIntegrityReport] = useState<{ valid: boolean; errors: string[]; recordCounts: Record<string, number> } | null>(null);

  // Deletion controls
  const [selectedDeleteCategory, setSelectedDeleteCategory] = useState<'meals' | 'workouts' | 'supplements' | 'measurements' | 'aiInsights'>('aiInsights');
  const [deleteBeforeDays, setDeleteBeforeDays] = useState<'30' | '90' | 'all'>('90');
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [showWipeDialog, setShowWipeDialog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUserName(userProfile.name || 'Utilizator Longevity');
      async function loadStats() {
        const p = await verifyPersistence();
        const est = await getStorageEstimate();
        const counts = await getRecordCounts();
        setStorageStats({
          usageFormatted: est.usageFormatted,
          totalRecords: p.totalRecords,
          lastSaved: p.lastSaved,
          isOpen: p.isOpen
        });
        setRecordCounts(counts);
      }
      loadStats();
    }
  }, [isOpen, userProfile.name]);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    await onUpdateProfile({
      name: userName.trim() || 'Utilizator Longevity',
      weightKg: parseFloat(weightKg) || 75,
      targetProteinGPerKg: parseFloat(proteinFactor) || 1.8,
      targetFibreG: parseFloat(fibreTarget) || 30,
      fastingTargetHours: parseInt(fastingHours, 10) || 16,
      citicolineWeekdaySchedule: citicolineSched,
      tier3CycleStartDate: cycleStartDate,
      dataRetentionDays: parseInt(retentionDays, 10) || 0,
      healthGoals,
      dietaryPreferences: dietaryPrefs,
      fitnessTargets: {
        weeklyStrengthSessions: parseInt(targetStrength, 10) || 3,
        weeklyZone2Minutes: parseInt(targetZone2Min, 10) || 120,
        weeklyVo2MaxSessions: parseInt(targetVo2Max, 10) || 1,
        weeklyMobilitySessions: parseInt(targetMobility, 10) || 3
      }
    });
    setStatusMessage({ type: 'success', text: 'Profilul personal și preferințele au fost actualizate.' });
  };

  const handleAddGoal = () => {
    if (newGoalInput.trim()) {
      setHealthGoals([...healthGoals, newGoalInput.trim()]);
      setNewGoalInput('');
    }
  };

  const handleRemoveGoal = (index: number) => {
    setHealthGoals(healthGoals.filter((_, i) => i !== index));
  };

  const handleAddDietary = () => {
    if (newDietaryInput.trim()) {
      setDietaryPrefs([...dietaryPrefs, newDietaryInput.trim()]);
      setNewDietaryInput('');
    }
  };

  const handleRemoveDietary = (index: number) => {
    setDietaryPrefs(dietaryPrefs.filter((_, i) => i !== index));
  };

  // Plain JSON export
  const handleExportJSON = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Longevity_3.2_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'Backup JSON descărcat cu succes.' });
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: 'error', text: 'Eroare la export: ' + error.message });
    }
  };

  // Plain JSON import with integrity check
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as ExportBackupPayload;
        const check = verifyBackupIntegrity(json);
        setIntegrityReport(check);
        if (!check.valid) {
          setStatusMessage({ type: 'error', text: 'Fișierul nu a trecut validarea de integritate: ' + check.errors.join('; ') });
          return;
        }
        await importDataPayload(json);
        await onReloadAllData();
        setStatusMessage({ type: 'success', text: 'Date restaurate cu succes din fișierul JSON.' });
      } catch (err: unknown) {
        const error = err as Error;
        setStatusMessage({ type: 'error', text: 'Eroare la restaurare JSON: ' + error.message });
      }
    };
    reader.readAsText(file);
  };

  // Encrypted backup
  const handleEncryptedBackup = async () => {
    if (!backupPassword || backupPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Parola de criptare trebuie să aibă minimum 6 caractere.' });
      return;
    }
    try {
      const encryptedStr = await encryptBackupWithPassword(backupPassword);
      const blob = new Blob([encryptedStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Longevity_3.2_Encrypted_${new Date().toISOString().split('T')[0]}.vault`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupPassword('');
      setStatusMessage({ type: 'success', text: 'Fișier criptat AES-GCM (PBKDF2) descărcat cu succes.' });
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: 'error', text: 'Eroare criptare: ' + error.message });
    }
  };

  // Decrypt and restore
  const handleDecryptRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!restorePassword) {
      setStatusMessage({ type: 'error', text: 'Introdu parola înainte de a selecta fișierul criptat.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const encryptedStr = event.target?.result as string;
        await decryptAndRestoreWithPassword(encryptedStr, restorePassword);
        await onReloadAllData();
        setRestorePassword('');
        setStatusMessage({ type: 'success', text: 'Backup decriptat, verificat și restaurat cu succes!' });
      } catch (err: unknown) {
        const error = err as Error;
        setStatusMessage({ type: 'error', text: error.message });
      }
    };
    reader.readAsText(file);
  };

  // Selective deletion
  const handleDeleteSelected = async () => {
    let beforeDate: string | undefined;
    if (deleteBeforeDays !== 'all') {
      const days = parseInt(deleteBeforeDays, 10);
      const d = new Date();
      d.setDate(d.getDate() - days);
      beforeDate = d.toISOString().split('T')[0];
    }

    if (confirm(`Sigur dorești să ștergi înregistrările pentru ${selectedDeleteCategory} (${deleteBeforeDays === 'all' ? 'toate' : `mai vechi de ${deleteBeforeDays} zile`})?`)) {
      const deletedCount = await deleteSelectedRecords(selectedDeleteCategory, { beforeDate });
      await onReloadAllData();
      const counts = await getRecordCounts();
      setRecordCounts(counts);
      setStatusMessage({ type: 'success', text: `S-au șters ${deletedCount} înregistrări din ${selectedDeleteCategory}.` });
    }
  };

  // Full wipe
  const handleFullWipe = async () => {
    if (wipeConfirmText !== 'STERGE') {
      setStatusMessage({ type: 'error', text: 'Tastează exact cuvântul STERGE pentru a confirma ștergerea completă.' });
      return;
    }
    await wipeAllData();
    await onReloadAllData();
    setShowWipeDialog(false);
    setWipeConfirmText('');
    setStatusMessage({ type: 'success', text: 'Toate datele locale au fost șterse. Baza a fost resetată la protocolul de bază.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Setări Sistem &amp; Memorie Sănătate
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('context')}
            className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'context'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Context Personal &amp; Ținte
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'memory'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Memorie &amp; Backup
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border border-rose-800 text-rose-200'
          }`}>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* TAB 1: PERSONAL CONTEXT */}
        {activeTab === 'context' && (
          <div className="space-y-4">
            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Principiul Suveranității Utilizatorului:</span>
              <p className="leading-relaxed">
                Nicio doză de supliment, intervenție medicală sau protocol experimental nu se modifică automat. Toate valorile sunt deținute și configurate exclusiv de tine.
              </p>
            </div>

            {/* Core Targets */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Parametri Fizici &amp; Nutriționali
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="text-slate-400 block mb-1">
                    Nume Profil <span className="text-[10px] text-cyan-400 font-mono">(stocat exclusiv local în IndexedDB)</span>
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    placeholder="Utilizator Longevity"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Greutate corporală (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Factor Proteină (1.6–2.2 g/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.6"
                    max="2.2"
                    value={proteinFactor}
                    onChange={e => setProteinFactor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Țintă Fibre (≥30 g/zi)</label>
                  <input
                    type="number"
                    value={fibreTarget}
                    onChange={e => setFibreTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Fereastră Fasting (ore)</label>
                  <input
                    type="number"
                    value={fastingHours}
                    onChange={e => setFastingHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Health Goals */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Obiective de Sănătate &amp; Longevitate
                </h3>
              </div>

              <div className="space-y-1.5 text-xs">
                {healthGoals.map((goal, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-300">● {goal}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGoal(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adaugă un obiectiv..."
                  value={newGoalInput}
                  onChange={e => setNewGoalInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddGoal}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adaugă
                </button>
              </div>
            </div>

            {/* Dietary Patterns */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Tipare &amp; Preferințe Alimentare
              </h3>

              <div className="space-y-1.5 text-xs">
                {dietaryPrefs.map((pref, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-300">✓ {pref}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDietary(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adaugă o preferință alimentară..."
                  value={newDietaryInput}
                  onChange={e => setNewDietaryInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddDietary}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adaugă
                </button>
              </div>
            </div>

            {/* Fitness Targets */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Ținte Săptămânale Fitness
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Forță (sesiuni/săpt)</label>
                  <input
                    type="number"
                    value={targetStrength}
                    onChange={e => setTargetStrength(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Zone 2 (min/săpt)</label>
                  <input
                    type="number"
                    value={targetZone2Min}
                    onChange={e => setTargetZone2Min(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">VO₂max (sesiuni/săpt)</label>
                  <input
                    type="number"
                    value={targetVo2Max}
                    onChange={e => setTargetVo2Max(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Mobilitate (sesiuni/săpt)</label>
                  <input
                    type="number"
                    value={targetMobility}
                    onChange={e => setTargetMobility(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Protocol Ambiguity & Cycling Preferences */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-white block">Ajustări Protocol Aprobate</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCiticolineSched('LMV')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border ${
                    citicolineSched === 'LMV'
                      ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Citicolină L/M/V (Secț. 5)
                </button>
                <button
                  type="button"
                  onClick={() => setCiticolineSched('LMJ')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border ${
                    citicolineSched === 'LMJ'
                      ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Citicolină L/M/J (Secț. 10)
                </button>
              </div>

              <div className="pt-1">
                <label className="text-slate-400 block mb-1">Dată Start Ciclu Tier 3 (8s ON / 2s OFF)</label>
                <input
                  type="date"
                  value={cycleStartDate}
                  onChange={e => setCycleStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950"
            >
              <Save className="w-4 h-4" /> Salvează Context &amp; Preferințe
            </button>
          </div>
        )}

        {/* TAB 2: MEMORIE & BACKUP */}
        {activeTab === 'memory' && (
          <div className="space-y-4">
            {/* Memory Status & Storage Stats */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Status Memorie Locală (IndexedDB)
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  ● Conectat &amp; Persistat
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-[9px] text-slate-400 font-sans uppercase block">Înregistrări</span>
                  <span className="text-sm font-bold text-white">{storageStats.totalRecords}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-[9px] text-slate-400 font-sans uppercase block">Stocare Locală</span>
                  <span className="text-sm font-bold text-cyan-300">{storageStats.usageFormatted}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-[9px] text-slate-400 font-sans uppercase block">Schema DB</span>
                  <span className="text-sm font-bold text-slate-300">v2 (Dexie)</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/60 font-mono">
                <div className="flex justify-between">
                  <span>Jurnale zilnice somn &amp; rutine:</span>
                  <strong className="text-slate-200">{recordCounts.dailyLogs || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Înregistrări alimente &amp; mese:</span>
                  <strong className="text-slate-200">{recordCounts.mealEntries || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Administrări suplimente:</span>
                  <strong className="text-slate-200">{recordCounts.supplementIntakes || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Sesiuni fitness &amp; antrenamente:</span>
                  <strong className="text-slate-200">{recordCounts.workoutSessions || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Măsurători corporale:</span>
                  <strong className="text-slate-200">{recordCounts.bodyMeasurements || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Rezultate analize laborator:</span>
                  <strong className="text-slate-200">{recordCounts.labResults || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Sugestii &amp; feedback AI salvate:</span>
                  <strong className="text-slate-200">{recordCounts.aiInsights || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Versiuni &amp; branduri suplimente:</span>
                  <strong className="text-cyan-300">{recordCounts.supplementProductVersions || 0}</strong>
                </div>
              </div>
            </div>

            {/* Retention and Privacy Controls */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-white block">Politica de Retenție a Datelor Locale</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRetentionDays('0')}
                  className={`py-1.5 rounded-lg border text-xs font-medium ${
                    retentionDays === '0'
                      ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Nelimitat (Recomandat)
                </button>
                <button
                  type="button"
                  onClick={() => setRetentionDays('365')}
                  className={`py-1.5 rounded-lg border text-xs font-medium ${
                    retentionDays === '365'
                      ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  365 de zile
                </button>
                <button
                  type="button"
                  onClick={() => setRetentionDays('90')}
                  className={`py-1.5 rounded-lg border text-xs font-medium ${
                    retentionDays === '90'
                      ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  90 de zile
                </button>
              </div>
            </div>

            {/* Encrypted Backup (AES-GCM Web Crypto) */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Lock className="w-4 h-4 text-cyan-400" /> Export Backup Criptat (AES-GCM 256-bit)
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Datele sunt criptate cu algoritmul militar AES-GCM derivat prin PBKDF2 (100.000 iterații) cu parola ta privată. Parola nu este stocată niciodată în browser sau pe server.
              </p>

              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Introdu parola de criptare (min. 6 caractere)..."
                  value={backupPassword}
                  onChange={e => setBackupPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                />
                <button
                  onClick={handleEncryptedBackup}
                  className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Descarcă Seif Criptat (.vault)
                </button>
              </div>

              {/* Decrypt and restore */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[11px] text-slate-300 block font-semibold">
                  Restaurare Seif Criptat (.vault):
                </span>
                <input
                  type="password"
                  placeholder="Introdu parola de decriptare..."
                  value={restorePassword}
                  onChange={e => setRestorePassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                />
                <label className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-center transition-colors">
                  <Unlock className="w-3.5 h-3.5 text-cyan-400" /> Selectează &amp; Decriptează Seif (.vault)
                  <input type="file" accept=".vault,.json" onChange={handleDecryptRestore} className="hidden" />
                </label>
              </div>
            </div>

            {/* Plain JSON Export / Import with Integrity Check */}
            <div className="space-y-2 pt-1 border-t border-slate-800 text-xs">
              <span className="font-bold text-slate-300 block">Export / Import JSON Clar</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportJSON}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" /> Export JSON
                </button>
                <label className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-center">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" /> Import JSON
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>
              </div>

              {integrityReport && (
                <div className={`p-2.5 rounded-xl border text-[11px] ${
                  integrityReport.valid
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}>
                  <span className="font-bold block">Raport Integritate Fișier:</span>
                  {integrityReport.valid ? (
                    <span>Fișier validat cu succes. Schema și toate structurile sunt conforme.</span>
                  ) : (
                    <span>Erori detectate: {integrityReport.errors.join(', ')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Selective Deletion */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Trash2 className="w-4 h-4 text-amber-400" /> Ștergere Selectivă de Înregistrări
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Categorie</label>
                  <select
                    value={selectedDeleteCategory}
                    onChange={e => setSelectedDeleteCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs"
                  >
                    <option value="aiInsights">Sugestii AI</option>
                    <option value="meals">Mese și alimente</option>
                    <option value="workouts">Sesiuni antrenament</option>
                    <option value="supplements">Administrări suplimente</option>
                    <option value="measurements">Măsurători corporale</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Interval</label>
                  <select
                    value={deleteBeforeDays}
                    onChange={e => setDeleteBeforeDays(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs"
                  >
                    <option value="30">Mai vechi de 30 de zile</option>
                    <option value="90">Mai vechi de 90 de zile</option>
                    <option value="all">Toate înregistrările</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="w-full py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-200 font-semibold text-xs transition-colors"
              >
                Șterge Înregistrările Selectate
              </button>
            </div>

            {/* Danger Zone: Full Wipe */}
            <div className="pt-2 border-t border-slate-800">
              {showWipeDialog ? (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 space-y-2 text-xs">
                  <p className="text-rose-200 font-semibold leading-relaxed">
                    Ești pe cale să ștergi IREVERSIBIL toate datele locale stocate în IndexedDB.
                    Pentru confirmare, tastează <strong>STERGE</strong>:
                  </p>
                  <input
                    type="text"
                    placeholder="Tastează STERGE"
                    value={wipeConfirmText}
                    onChange={e => setWipeConfirmText(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-700 rounded-lg p-2 text-white font-mono uppercase"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowWipeDialog(false); setWipeConfirmText(''); }}
                      className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                    >
                      Renunță
                    </button>
                    <button
                      onClick={handleFullWipe}
                      className="flex-1 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold"
                    >
                      Șterge Tot
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowWipeDialog(true)}
                  className="w-full py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Ștergere Completă Bază Date (Full Wipe)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
