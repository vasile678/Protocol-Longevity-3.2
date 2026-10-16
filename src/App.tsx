/**
 * LONGEVITY 3.2 — PERSONAL HEALTHSPAN OS
 * Master Application Shell
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TopBar,
  BottomTabBar,
  TabType
} from './components/Navigation';
import { TodayTab } from './components/TodayTab';
import { NutritionTab } from './components/NutritionTab';
import { SupplementsTab } from './components/SupplementsTab';
import { FitnessTab } from './components/FitnessTab';
import { LabTestsTab } from './components/LabTestsTab';
import { AICoachTab } from './components/AICoachTab';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { OfflineIndicator, StorageWarningBanner } from './components/OfflineIndicator';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  db,
  initializeDatabase,
  verifyPersistence,
  replaceSupplementBrand,
  ReplaceBrandParams
} from './db';
import {
  UserProfile,
  DailyLog,
  MealEntry,
  FoodItem,
  SupplementDefinition,
  SupplementIntake,
  SupplementProductVersion,
  WorkoutSession,
  BodyMeasurement,
  BiomarkerDefinition,
  LabResult,
  LabDocument,
  AIInsight
} from './types/protocol';
import { DEFAULT_USER_PROFILE, PROTOCOL_BIOMARKERS } from './data/protocolData';
import { generateDeterministicInsights } from './utils/deterministicEngine';
import {
  calculateLongitudinalMetrics,
  buildAIMemorySummary,
  identifyLongitudinalShifts
} from './utils/longitudinalEngine';
import { evaluateLabResultAlert } from './utils/labAlertsEngine';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [isDbReady, setIsDbReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState(false);
  const [showStorageWarning, setShowStorageWarning] = useState(true);

  // Core Data States
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [dailyLog, setDailyLog] = useState<DailyLog | undefined>(undefined);
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [allRecentMeals, setAllRecentMeals] = useState<MealEntry[]>([]);
  const [availableFoods, setAvailableFoods] = useState<FoodItem[]>([]);
  const [supplements, setSupplements] = useState<SupplementDefinition[]>([]);
  const [intakes, setIntakes] = useState<SupplementIntake[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [biomarkers, setBiomarkers] = useState<BiomarkerDefinition[]>(PROTOCOL_BIOMARKERS);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [labDocuments, setLabDocuments] = useState<LabDocument[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [supplementProducts, setSupplementProducts] = useState<SupplementProductVersion[]>([]);

  const [isMemoryActive, setIsMemoryActive] = useState(false);
  const [longitudinalMetrics7d, setLongitudinalMetrics7d] = useState<any>(null);
  const [longitudinalMetrics30d, setLongitudinalMetrics30d] = useState<any>(null);
  const [longitudinalShifts, setLongitudinalShifts] = useState<string[]>([]);

  const { isInstallable, isIOS, install } = usePWAInstall();

  // Load all records for selectedDate from IndexedDB
  const reloadData = useCallback(async () => {
    try {
      // 1. Verificare persistență locală IndexedDB
      const persistCheck = await verifyPersistence();
      setIsMemoryActive(persistCheck.verified);

      const profile = (await db.userProfile.get('primary_user')) || DEFAULT_USER_PROFILE;
      setUserProfile(profile);

      const log = await db.dailyLogs.get(selectedDate);
      setDailyLog(log);

      const allLogs = await db.dailyLogs.toArray();

      const meals = await db.mealEntries.where('date').equals(selectedDate).toArray();
      setTodayMeals(meals);

      const allMeals = await db.mealEntries.toArray();
      setAllRecentMeals(allMeals);

      const foods = await db.foodItems.toArray();
      setAvailableFoods(foods);

      const supps = await db.supplementDefinitions.toArray();
      setSupplements(supps);

      const prods = await db.supplementProductVersions.toArray();
      setSupplementProducts(prods);

      const intakesList = await db.supplementIntakes.where('date').equals(selectedDate).toArray();
      setIntakes(intakesList);
      const allIntakes = await db.supplementIntakes.toArray();

      const workoutList = await db.workoutSessions.toArray();
      setWorkouts(workoutList);

      const measurementList = await db.bodyMeasurements.toArray();
      setMeasurements(measurementList);

      const bioList = await db.biomarkerDefinitions.toArray();
      setBiomarkers(bioList);

      const resultsList = await db.labResults.toArray();
      setLabResults(resultsList);

      const docsList = await db.labDocuments.toArray();
      setLabDocuments(docsList);

      const allStoredInsights = await db.aiInsights.toArray();
      let insightsList = await db.aiInsights.where('date').equals(selectedDate).toArray();

      // Calculează metricile longitudinale (7z și 30z) și deviațiile
      const m7 = calculateLongitudinalMetrics(7, allLogs, allMeals, workoutList, allIntakes, measurementList, allStoredInsights, selectedDate);
      const m30 = calculateLongitudinalMetrics(30, allLogs, allMeals, workoutList, allIntakes, measurementList, allStoredInsights, selectedDate);
      setLongitudinalMetrics7d(m7);
      setLongitudinalMetrics30d(m30);
      const shifts = identifyLongitudinalShifts(m7, m30);
      setLongitudinalShifts(shifts);

      // If no insights exist for today yet, generate deterministic ones initially
      if (insightsList.length === 0) {
        const initialDeterministic = generateDeterministicInsights({
          today: selectedDate,
          userProfile: profile,
          dailyLog: log,
          todayMeals: meals,
          todaySupplements: supps,
          todayIntakes: intakesList,
          weekWorkouts: workoutList,
          recentDaysLogs: log ? [log] : []
        });

        if (initialDeterministic.length > 0) {
          await db.aiInsights.bulkPut(initialDeterministic);
          insightsList = initialDeterministic;
        }
      }

      setAiInsights(insightsList);
    } catch (err) {
      console.error('Eroare la încărcarea datelor din IndexedDB:', err);
    }
  }, [selectedDate]);

  // Initial DB Bootstrapping
  useEffect(() => {
    async function boot() {
      await initializeDatabase();
      setIsDbReady(true);
    }
    boot();
  }, []);

  useEffect(() => {
    if (isDbReady) {
      reloadData();
    }
  }, [isDbReady, reloadData]);

  // Handlers
  const handleUpdateDailyLog = async (partialLog: Partial<DailyLog>) => {
    const existing = await db.dailyLogs.get(selectedDate);
    const updated: DailyLog = {
      ...(existing || { date: selectedDate, updatedAt: new Date().toISOString() }),
      ...partialLog,
      updatedAt: new Date().toISOString()
    };
    await db.dailyLogs.put(updated);
    setDailyLog(updated);
  };

  const handleToggleSupplementIntake = async (
    supplementId: string,
    status: 'taken' | 'skipped'
  ) => {
    const intakeId = `${selectedDate}_${supplementId}`;
    const existing = intakes.find(i => i.supplementId === supplementId);

    // If already has that status, toggle off back to pending/removed
    if (existing?.status === status) {
      await db.supplementIntakes.delete(existing.id);
    } else {
      const activeProd = supplementProducts.find(p => p.supplementId === supplementId && !p.isArchived);
      const suppDef = supplements.find(s => s.id === supplementId);
      const newIntake: SupplementIntake = {
        id: intakeId,
        date: selectedDate,
        supplementId,
        productId: activeProd?.id || suppDef?.currentProductId,
        productBrand: activeProd?.brandName || suppDef?.currentBrandName,
        status,
        timestamp: new Date().toISOString()
      };
      await db.supplementIntakes.put(newIntake);
    }
    const updatedIntakes = await db.supplementIntakes.where('date').equals(selectedDate).toArray();
    setIntakes(updatedIntakes);
  };

  const handleAddMealEntry = async (entryData: Omit<MealEntry, 'id' | 'createdAt'>) => {
    const newEntry: MealEntry = {
      ...entryData,
      id: `meal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    await db.mealEntries.put(newEntry);
    await reloadData();
  };

  const handleDeleteMealEntry = async (id: string) => {
    await db.mealEntries.delete(id);
    await reloadData();
  };

  const handleAddCustomFood = async (foodData: Omit<FoodItem, 'id'>) => {
    const newFood: FoodItem = {
      ...foodData,
      id: `custom_${Date.now()}`
    };
    await db.foodItems.put(newFood);
    await reloadData();
  };

  const handleAddWorkout = async (workoutData: Omit<WorkoutSession, 'id' | 'createdAt'>) => {
    const newWorkout: WorkoutSession = {
      ...workoutData,
      id: `workout_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await db.workoutSessions.put(newWorkout);
    await reloadData();
  };

  const handleDeleteWorkout = async (id: string) => {
    await db.workoutSessions.delete(id);
    await reloadData();
  };

  const handleAddMeasurement = async (measData: Omit<BodyMeasurement, 'id' | 'createdAt'>) => {
    const newMeas: BodyMeasurement = {
      ...measData,
      id: `meas_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await db.bodyMeasurements.put(newMeas);
    await reloadData();
  };

  const handleAddLabResult = async (resData: Omit<LabResult, 'id' | 'createdAt'>) => {
    const id = `lab_${Date.now()}`;
    const bioDef = biomarkers.find(b => b.id === resData.biomarkerId);
    let alertData = resData.alert;
    if (!alertData && bioDef) {
      alertData = evaluateLabResultAlert({
        result: {
          id,
          ...resData
        },
        biomarker: bioDef,
        userProfile
      });
    }

    const newResult: LabResult = {
      ...resData,
      id,
      alert: alertData,
      createdAt: new Date().toISOString()
    };
    await db.labResults.put(newResult);
    await reloadData();
  };

  const handleToggleBiomarkerAlerts = async (biomarkerId: string, enabled: boolean) => {
    await db.biomarkerDefinitions.update(biomarkerId, { alertsEnabled: enabled });
    const updatedPreferences = {
      ...(userProfile.biomarkerAlertPreferences || {}),
      [biomarkerId]: {
        biomarkerId,
        enabled
      }
    };
    await db.userProfile.update('primary_user', {
      biomarkerAlertPreferences: updatedPreferences,
      updatedAt: new Date().toISOString()
    });
    await reloadData();
  };

  const handleAcknowledgeAlert = async (resultId: string) => {
    const res = await db.labResults.get(resultId);
    if (res && res.alert) {
      res.alert.acknowledged = true;
      res.alert.notificationVisible = false;
      await db.labResults.put(res);
      await reloadData();
    }
  };

  const handleDeleteLabResult = async (id: string) => {
    await db.labResults.delete(id);
    await reloadData();
  };

  const handleUploadDocument = async (docData: Omit<LabDocument, 'id'>): Promise<string> => {
    const docId = `doc_${Date.now()}`;
    const newDoc: LabDocument = {
      ...docData,
      id: docId
    };
    await db.labDocuments.put(newDoc);
    await reloadData();
    return docId;
  };

  const handleUpdateSupplement = async (supp: SupplementDefinition) => {
    await db.supplementDefinitions.put(supp);
    await reloadData();
  };

  const handleReplaceBrand = async (params: ReplaceBrandParams) => {
    await replaceSupplementBrand(params);
    await reloadData();
  };

  const handleUpdateUserProfile = async (partialProfile: Partial<UserProfile>) => {
    const updated: UserProfile = {
      ...userProfile,
      ...partialProfile,
      updatedAt: new Date().toISOString()
    };
    await db.userProfile.put(updated);
    setUserProfile(updated);
  };

  const handleGenerateDeterministic = async () => {
    const deterministic = generateDeterministicInsights({
      today: selectedDate,
      userProfile,
      dailyLog,
      todayMeals,
      todaySupplements: supplements,
      todayIntakes: intakes,
      weekWorkouts: workouts,
      recentDaysLogs: dailyLog ? [dailyLog] : []
    });

    // Replace current date insights
    const existingForDate = await db.aiInsights.where('date').equals(selectedDate).toArray();
    await Promise.all(existingForDate.map(i => db.aiInsights.delete(i.id)));
    await db.aiInsights.bulkPut(deterministic);
    setAiInsights(deterministic);
  };

  const handleGenerateGeminiAI = async () => {
    // Construire rezumat minim de memorie AI
    const allLogs = await db.dailyLogs.toArray();
    const allMeals = await db.mealEntries.toArray();
    const allWorkouts = await db.workoutSessions.toArray();
    const allIntakes = await db.supplementIntakes.toArray();
    const allMeasurements = await db.bodyMeasurements.toArray();
    const allStoredInsights = await db.aiInsights.toArray();

    const minimalMemory = buildAIMemorySummary(
      allLogs,
      allMeals,
      allWorkouts,
      allIntakes,
      allMeasurements,
      allStoredInsights,
      selectedDate
    );

    const payload = {
      profile: userProfile,
      dailyLog,
      meals: todayMeals,
      workouts,
      supplementIntakes: intakes,
      longitudinalMemory: minimalMemory,
      consentGranted: userProfile.aiConsentGranted
    };

    try {
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        const existingForDate = await db.aiInsights.where('date').equals(selectedDate).toArray();
        await Promise.all(existingForDate.map(i => db.aiInsights.delete(i.id)));
        await db.aiInsights.bulkPut(data.insights);
        setAiInsights(data.insights);
        return;
      }
      throw new Error('Răspuns AI invalid. Trecem pe evaluare deterministă.');
    } catch {
      // Graceful offline fallback to deterministic engine
      await handleGenerateDeterministic();
      throw new Error('Serviciul Gemini nu a putut fi contactat. S-a generat evaluarea offline deterministă.');
    }
  };

  const handleUpdateInsightFeedback = async (
    id: string,
    feedback: 'useful' | 'not_useful' | 'completed'
  ) => {
    const insight = await db.aiInsights.get(id);
    if (insight) {
      insight.feedback = feedback;
      await db.aiInsights.put(insight);
      setAiInsights(prev => prev.map(i => (i.id === id ? { ...i, feedback } : i)));
    }
  };

  const handleInstallApp = async () => {
    if (isInstallable) {
      await install();
    } else {
      setIsPWAInstallModalOpen(true);
    }
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center text-slate-400 space-y-3 font-sans">
        <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center animate-pulse">
          <span className="text-cyan-400 font-bold text-sm">3.2</span>
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-300">
          Inițializare Longevity 3.2 OS...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200 overflow-x-clip">
      <OfflineIndicator />

      {/* Top Bar Navigation */}
      <TopBar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isInstallable={isInstallable || isIOS}
        onInstallApp={handleInstallApp}
        isMemoryActive={isMemoryActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto pt-4 sm:pt-5 px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] overflow-x-clip">
        {!isMemoryActive && showStorageWarning && (
          <div className="mb-3">
            <StorageWarningBanner onDismiss={() => setShowStorageWarning(false)} />
          </div>
        )}

        {currentTab === 'today' && (
          <TodayTab
            selectedDate={selectedDate}
            dailyLog={dailyLog}
            userProfile={userProfile}
            todayMeals={todayMeals}
            supplements={supplements}
            intakes={intakes}
            todayWorkouts={workouts.filter(w => w.date === selectedDate)}
            aiInsights={aiInsights}
            biomarkers={biomarkers}
            labResults={labResults}
            longitudinalShifts={longitudinalShifts}
            onUpdateDailyLog={handleUpdateDailyLog}
            onToggleSupplementIntake={handleToggleSupplementIntake}
            onNavigateToTab={setCurrentTab}
            onUpdateInsightFeedback={handleUpdateInsightFeedback}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {currentTab === 'nutrition' && (
          <NutritionTab
            selectedDate={selectedDate}
            userProfile={userProfile}
            meals={todayMeals}
            availableFoods={availableFoods}
            allRecentMeals={allRecentMeals}
            onAddMealEntry={handleAddMealEntry}
            onDeleteMealEntry={handleDeleteMealEntry}
            onAddCustomFood={handleAddCustomFood}
          />
        )}

        {currentTab === 'supplements' && (
          <SupplementsTab
            selectedDate={selectedDate}
            userProfile={userProfile}
            supplements={supplements}
            supplementProducts={supplementProducts}
            intakes={intakes}
            onToggleIntake={handleToggleSupplementIntake}
            onUpdateSupplement={handleUpdateSupplement}
            onReplaceBrand={handleReplaceBrand}
            onUpdateUserProfile={handleUpdateUserProfile}
          />
        )}

        {currentTab === 'fitness' && (
          <FitnessTab
            selectedDate={selectedDate}
            workouts={workouts}
            measurements={measurements}
            onAddWorkout={handleAddWorkout}
            onDeleteWorkout={handleDeleteWorkout}
            onAddMeasurement={handleAddMeasurement}
          />
        )}

        {currentTab === 'labs' && (
          <LabTestsTab
            selectedDate={selectedDate}
            biomarkers={biomarkers}
            results={labResults}
            documents={labDocuments}
            userProfile={userProfile}
            onAddLabResult={handleAddLabResult}
            onDeleteLabResult={handleDeleteLabResult}
            onUploadDocument={handleUploadDocument}
            onToggleBiomarkerAlerts={handleToggleBiomarkerAlerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
          />
        )}

        {currentTab === 'ai' && (
          <AICoachTab
            selectedDate={selectedDate}
            userProfile={userProfile}
            dailyLog={dailyLog}
            todayMeals={todayMeals}
            todayIntakes={intakes}
            weekWorkouts={workouts}
            insights={aiInsights}
            metrics7d={longitudinalMetrics7d}
            metrics30d={longitudinalMetrics30d}
            longitudinalShifts={longitudinalShifts}
            onGenerateDeterministic={handleGenerateDeterministic}
            onGenerateGeminiAI={handleGenerateGeminiAI}
            onUpdateFeedback={handleUpdateInsightFeedback}
            onUpdateConsent={granted => handleUpdateUserProfile({ aiConsentGranted: granted })}
          />
        )}
      </main>

      {/* Bottom Tab Bar (Fixed thumb zone) */}
      <BottomTabBar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />

      {/* Settings Modal */}
      <SettingsModal
        userProfile={userProfile}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateProfile={handleUpdateUserProfile}
        onReloadAllData={reloadData}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
      />
    </div>
  );
}
