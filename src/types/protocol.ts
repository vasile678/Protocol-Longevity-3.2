/**
 * LONGEVITY 3.2 — PERSONAL HEALTHSPAN OS
 * Versioned TypeScript Data Models
 */

export type ProtocolTier = 'core' | 'support' | 'experimental';

export interface ProtocolAdjustment {
  id: string;
  date: string;
  title: string;
  description: string;
  status: 'approved' | 'active' | 'retired';
}

export interface FitnessTargets {
  weeklyStrengthSessions: number; // default: 3
  weeklyZone2Minutes: number; // default: 120
  weeklyVo2MaxSessions: number; // default: 1
  weeklyMobilitySessions: number; // default: 3
}

export interface UserProfile {
  id: string; // 'primary_user'
  name: string;
  weightKg: number; // For dynamic protein target calculation
  targetProteinGPerKg: number; // Default 1.8 g/kg (range 1.6 - 2.2 g/kg)
  targetFibreG: number; // Default 30 g/day
  fastingTargetHours: number; // Default 16 (16:8 protocol)
  labCadenceMonths: number; // Default 6 months
  // Ambiguity preferences explicitly confirmed by user
  citicolineWeekdaySchedule: 'LMV' | 'LMJ'; // L/M/V (Sec 5) vs L/M/J (Sec 10)
  tier3CyclingScope: 'all_tier3' | 'mb_only'; // Whether 8w ON / 2w OFF applies to all Tier 3 or just MB
  tier3CycleStartDate: string; // ISO date 'YYYY-MM-DD'
  tier3WeeksOn: number; // 8
  tier3WeeksOff: number; // 2
  // Personal Context (Healthspan Goals & Preferences)
  healthGoals?: string[];
  dietaryPreferences?: string[];
  fitnessTargets?: FitnessTargets;
  approvedProtocolAdjustments?: ProtocolAdjustment[];
  dataRetentionDays?: number; // 0 = nelimitat, 90, 365
  aiConsentGranted: boolean;
  aiConsentTimestamp?: string;
  biomarkerAlertPreferences?: Record<string, BiomarkerAlertConfig>;
  updatedAt: string;
}

export interface BiomarkerAlertConfig {
  biomarkerId: string;
  enabled: boolean;
  notifyOnMildDeviation?: boolean;
  customNotes?: string;
}

export interface ProtocolVersionRecord {
  version: string;
  name: string;
  activeDate: string;
  description: string;
  updatedAt: string;
}

export interface LongitudinalMetrics {
  periodDays: number;
  startDate: string;
  endDate: string;
  daysLogged: number;
  averageSleepHours: number;
  averageSleepQuality: number;
  averageProteinG: number;
  averageFibreG: number;
  averageCalories: number;
  supplementAdherencePct: number;
  strengthSessionsTotal: number;
  zone2MinutesTotal: number;
  vo2maxSessionsTotal: number;
  mobilitySessionsTotal: number;
  weightDeltaKg?: number;
  waistDeltaCm?: number;
  completedActionsCount: number;
}

export interface AIMemorySummary {
  past7dAverages: {
    sleepHours: number;
    proteinG: number;
    fibreG: number;
    supplementAdherencePct: number;
    workoutsCount: number;
  };
  past30dAverages: {
    sleepHours: number;
    proteinG: number;
    fibreG: number;
    supplementAdherencePct: number;
    workoutsCount: number;
  };
  previousCompletedActions: string[];
  previousUsefulInsights: string[];
  confirmedObservations: string[];
  hypothesesUnderReview: string[];
}

export interface DailyLog {
  date: string; // YYYY-MM-DD (unique key)
  // Somn (7-9 ore țintă)
  sleepHours?: number;
  sleepQuality?: number; // 1-10
  bedtime?: string; // HH:mm
  wakeTime?: string; // HH:mm
  // Rutină dimineață
  morningLightMinutes?: number; // 10-20 min lumină naturală
  morningHydrationDone?: boolean; // 400 ml apă minerală + ~1 g sare
  morningCoffeeDone?: boolean;
  // Rutină seară
  eveningWindDownDone?: boolean; // Lumină redusă, temp joasă, fără ecrane 1-2h
  // Recuperare & energie
  subjectiveEnergy?: number; // 1-10
  subjectiveRecovery?: number; // 1-10
  notes?: string;
  updatedAt: string;
}

export type MealType = 'masa1' | 'masa2' | 'omad' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  category: 'legume' | 'fructe' | 'proteine' | 'grasimi_sanatoase' | 'fermentate_fibre' | 'altele';
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fibrePer100g: number;
  isStaple: boolean; // Aliment de bază din Protocol 3.2
  isCustom: boolean;
  sourceNote?: string;
}

export interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  source: string; // e.g. "Protocol 3.2 db" | "Manual"
  uncertainty: string; // e.g. "±5% estimare analitică"
  time?: string;
  createdAt: string;
}

export interface SupplementProductVersion {
  id: string; // e.g. "prod_creatine_creapure_20261012"
  supplementId: string; // References the protocol supplement (e.g. "creatine")
  brandName: string;
  productName: string;
  form: string; // e.g. "Pulbere", "Capsule", "Picături", "Comprimate"
  servingSize: string; // e.g. "5 g (1 cupă)", "2 capsule"
  activeIngredients: string;
  concentrationPerServing: string; // e.g. "5000 mg", "500 mg EPA + 250 mg DHA"
  labelNotes?: string;
  photoDataUrl?: string; // Stored photo (Base64)
  effectiveStartDate: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD (set when replaced/archived)
  isArchived: boolean;
  concentrationChangeWarning?: string;
  createdAt: string;
}

export interface SupplementDefinition {
  id: string;
  name: string;
  tier: ProtocolTier;
  tierLabel: string;
  timing: 'dimineata' | 'seara';
  doseDescription: string;
  scheduledDays: number[]; // 0 = Duminică, 1 = Luni, 2 = Marți, ..., 6 = Sâmbătă
  activeIngredients: string;
  isCycling: boolean;
  reviewWarning?: string;
  governanceNote: string;
  hasAmbiguity?: boolean;
  ambiguityDetail?: string;
  // Current active brand product info
  currentBrandName?: string;
  currentProductName?: string;
  currentForm?: string;
  currentServingSize?: string;
  currentConcentration?: string;
  currentPhotoDataUrl?: string;
  currentProductId?: string;
  concentrationReviewFlag?: string; // Flag if brand replacement changed concentration
}

export type SupplementIntakeStatus = 'taken' | 'skipped' | 'not_scheduled';

export interface SupplementIntake {
  id: string;
  date: string; // YYYY-MM-DD
  supplementId: string;
  productId?: string; // Original product version ID at the time of intake
  productBrand?: string; // Brand snapshot
  status: SupplementIntakeStatus;
  timestamp?: string;
  reasonSkipped?: string;
}

export type WorkoutType = 'strength' | 'zone2' | 'vo2max' | 'mobility';

export interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  type: WorkoutType;
  title: string;
  durationMinutes: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpe?: number; // 1-10
  strengthFocus?: Array<'picioare' | 'sold' | 'impins' | 'tras' | 'core' | 'grip'>;
  exercisesNotes?: string;
  completed: boolean;
  createdAt: string;
}

export interface BodyMeasurement {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg?: number;
  waistCircumferenceCm?: number;
  bodyFatPercentage?: number;
  muscleMassKg?: number;
  vo2maxEstimate?: number;
  notes?: string;
  createdAt: string;
}

export interface BiomarkerDefinition {
  id: string;
  code: string;
  name: string;
  tier: 'core' | 'optional' | 'custom';
  unit: string;
  optimalMin?: number;
  optimalMax?: number;
  clinicalRefMin?: number;
  clinicalRefMax?: number;
  category: 'lipide' | 'metabolic' | 'inflamatie' | 'vitamine_nutrienti' | 'fitness';
  cadenceDescription: string;
  rationale: string;
  alertsEnabled?: boolean; // Permite activarea / dezactivarea alertelor per biomarker
}

export type LabAlertSeverity =
  | 'normal'
  | 'abatere_usoara'
  | 'evaluare_medicala'
  | 'valoare_critica'
  | 'unitate_incompatibila'
  | 'interval_lipsa';

export type LabAlertDirection = 'in_range' | 'low' | 'high' | 'unknown';

export interface ClinicalAssessment {
  severity: LabAlertSeverity;
  direction: LabAlertDirection;
  isCritical: boolean;
  title: string;
  message: string;
  clinicalGuidance?: string;
  referenceUsed: string;
  evidenceSource?: string;
  clinicalContext?: 'urgenta_imediata' | 'evaluare_medicala_prompta' | 'reevaluare_confirmare' | 'monitorizare_de_rutina';
  interpretationLimitations?: string;
}

export interface LabResultAlert {
  id: string; // alert_${resultId}
  resultId: string;
  biomarkerId: string;
  biomarkerCode: string;
  biomarkerName: string;
  testDate: string;
  value: number;
  unit: string;
  direction: LabAlertDirection;
  severity: LabAlertSeverity;
  title: string;
  message: string;
  clinicalGuidance?: string;
  referenceUsed: string; // e.g. "Synevo (< 80 mg/dL)" sau "Interval clinic fallback (40–100 mg/dL)"
  isCritical: boolean;
  acknowledged?: boolean;
  createdAt: string;

  // Separarea evaluării clinice de notificările utilizatorului (Cerința 1):
  clinicalAssessment: ClinicalAssessment;
  notificationEnabled: boolean; // Preferința utilizatorului pentru acest biomarker
  notificationVisible: boolean; // Notificarea activă / afișată în centrul de alerte
}

export interface LabResult {
  id: string;
  biomarkerId: string;
  testDate: string; // YYYY-MM-DD
  value: number;
  unit: string;
  referenceInterval: string;
  laboratory: string; // Synevo, MedLife, Regina Maria etc.
  notes?: string;
  documentId?: string;
  alert?: LabResultAlert; // Alerta calculată persistentă
  createdAt: string;
}

export interface LabDocument {
  id: string;
  uploadDate: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  dataUrl?: string; // Local storage base64
  extractedTextPreview?: string;
  confirmedByUser: boolean;
}

export interface AIInsight {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  observation: string;
  suggestion: string;
  missingDataNotes?: string;
  priority: 'high' | 'medium' | 'low';
  category: 'sleep' | 'fitness' | 'nutrition' | 'supplements' | 'recovery';
  isDeterministic: boolean; // Distinguish between AI generated and transparent deterministic rule
  feedback?: 'useful' | 'not_useful' | 'completed';
  createdAt: string;
}

export interface ExperimentalIntervention {
  id: string;
  name: string;
  tier: 'experimental';
  hypothesis: string;
  metric: string;
  durationWeeks: number;
  stopCriteria: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  currentCyclePhase: 'ON' | 'OFF';
  currentCycleWeek: number;
  outcome?: string;
  decision?: string;
  reviewDate: string;
}

export interface ExportBackupPayload {
  version: string;
  schemaVersion: number;
  exportedAt: string;
  app: 'Longevity 3.2 — Personal Healthspan OS';
  userProfile: UserProfile;
  dailyLogs: DailyLog[];
  mealEntries: MealEntry[];
  foodItems: FoodItem[];
  supplementIntakes: SupplementIntake[];
  workoutSessions: WorkoutSession[];
  bodyMeasurements: BodyMeasurement[];
  labResults: LabResult[];
  labDocuments: LabDocument[];
  aiInsights: AIInsight[];
  experimentalInterventions: ExperimentalIntervention[];
  protocolVersions?: ProtocolVersionRecord[];
  supplementProductVersions?: SupplementProductVersion[];
}
