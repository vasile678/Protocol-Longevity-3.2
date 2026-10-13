import Dexie, { type Table } from 'dexie';
import {
  UserProfile,
  DailyLog,
  MealEntry,
  FoodItem,
  SupplementDefinition,
  SupplementIntake,
  WorkoutSession,
  BodyMeasurement,
  BiomarkerDefinition,
  LabResult,
  LabDocument,
  AIInsight,
  ExperimentalIntervention,
  ExportBackupPayload,
  ProtocolVersionRecord,
  SupplementProductVersion
} from '../types/protocol';
import {
  DEFAULT_USER_PROFILE,
  DEFAULT_PROTOCOL_VERSION,
  PROTOCOL_SUPPLEMENTS,
  INITIAL_SUPPLEMENT_PRODUCTS,
  STAPLE_FOODS,
  PROTOCOL_BIOMARKERS,
  DEFAULT_EXPERIMENTAL_INTERVENTIONS
} from '../data/protocolData';
import { evaluateLabResultAlert } from '../utils/labAlertsEngine';

export class LongevityDatabase extends Dexie {
  userProfile!: Table<UserProfile, string>;
  dailyLogs!: Table<DailyLog, string>;
  mealEntries!: Table<MealEntry, string>;
  foodItems!: Table<FoodItem, string>;
  supplementDefinitions!: Table<SupplementDefinition, string>;
  supplementIntakes!: Table<SupplementIntake, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  bodyMeasurements!: Table<BodyMeasurement, string>;
  biomarkerDefinitions!: Table<BiomarkerDefinition, string>;
  labResults!: Table<LabResult, string>;
  labDocuments!: Table<LabDocument, string>;
  aiInsights!: Table<AIInsight, string>;
  experimentalInterventions!: Table<ExperimentalIntervention, string>;
  protocolVersions!: Table<ProtocolVersionRecord, string>;
  supplementProductVersions!: Table<SupplementProductVersion, string>;

  constructor() {
    super('Longevity32OS');
    // Version 1 schema (initial)
    this.version(1).stores({
      userProfile: 'id',
      dailyLogs: 'date',
      mealEntries: 'id, date, mealType',
      foodItems: 'id, name, category, isStaple',
      supplementDefinitions: 'id, tier, timing',
      supplementIntakes: 'id, [date+supplementId], date, supplementId',
      workoutSessions: 'id, date, type',
      bodyMeasurements: 'id, date',
      biomarkerDefinitions: 'id, code, tier',
      labResults: 'id, biomarkerId, testDate',
      labDocuments: 'id, uploadDate',
      aiInsights: 'id, date, priority',
      experimentalInterventions: 'id, status'
    });

    // Version 2 schema (adds protocolVersions longitudinal audit store)
    this.version(2).stores({
      protocolVersions: 'version, activeDate'
    });

    // Version 3 schema (adds supplementProductVersions for brand replacement & versioning)
    this.version(3).stores({
      supplementProductVersions: 'id, supplementId, isArchived, effectiveStartDate'
    });
  }
}

export const db = new LongevityDatabase();

/**
 * Verifică și populează baza de date cu datele oficiale din Protocol 3.2
 */
export async function initializeDatabase(): Promise<void> {
  const profileCount = await db.userProfile.count();
  if (profileCount === 0) {
    await db.userProfile.put(DEFAULT_USER_PROFILE);
  } else {
    // Asigură că profilul existent are toate câmpurile de context personal
    const existing = await db.userProfile.get('primary_user');
    if (existing && (!existing.healthGoals || !existing.fitnessTargets)) {
      await db.userProfile.put({
        ...DEFAULT_USER_PROFILE,
        ...existing,
        healthGoals: existing.healthGoals || DEFAULT_USER_PROFILE.healthGoals,
        dietaryPreferences: existing.dietaryPreferences || DEFAULT_USER_PROFILE.dietaryPreferences,
        fitnessTargets: existing.fitnessTargets || DEFAULT_USER_PROFILE.fitnessTargets,
        approvedProtocolAdjustments: existing.approvedProtocolAdjustments || DEFAULT_USER_PROFILE.approvedProtocolAdjustments,
        dataRetentionDays: existing.dataRetentionDays ?? 0
      });
    }
  }

  const verCount = await db.protocolVersions.count();
  if (verCount === 0) {
    await db.protocolVersions.put(DEFAULT_PROTOCOL_VERSION);
  }

  const suppCount = await db.supplementDefinitions.count();
  if (suppCount === 0) {
    await db.supplementDefinitions.bulkPut(PROTOCOL_SUPPLEMENTS);
  }

  const foodCount = await db.foodItems.count();
  if (foodCount === 0) {
    await db.foodItems.bulkPut(STAPLE_FOODS);
  }

  const bioCount = await db.biomarkerDefinitions.count();
  if (bioCount === 0) {
    await db.biomarkerDefinitions.bulkPut(PROTOCOL_BIOMARKERS);
  }

  const prodCount = await db.supplementProductVersions.count();
  if (prodCount === 0) {
    await db.supplementProductVersions.bulkPut(INITIAL_SUPPLEMENT_PRODUCTS);
  }

  // Asigură că definițiile suplimentelor au legătură cu produsul curent
  const allSuppDefs = await db.supplementDefinitions.toArray();
  for (const s of allSuppDefs) {
    if (!s.currentProductId) {
      const activeProd = await db.supplementProductVersions
        .where('supplementId')
        .equals(s.id)
        .filter(p => !p.isArchived)
        .first();
      if (activeProd) {
        await db.supplementDefinitions.update(s.id, {
          currentProductId: activeProd.id,
          currentBrandName: activeProd.brandName,
          currentProductName: activeProd.productName,
          currentForm: activeProd.form,
          currentServingSize: activeProd.servingSize,
          currentConcentration: activeProd.concentrationPerServing,
          currentPhotoDataUrl: activeProd.photoDataUrl
        });
      }
    }
  }

  const expCount = await db.experimentalInterventions.count();
  if (expCount === 0) {
    await db.experimentalInterventions.bulkPut(DEFAULT_EXPERIMENTAL_INTERVENTIONS);
  }

  // Asigură înregistrarea zilei curente dacă nu există
  const todayStr = new Date().toISOString().split('T')[0];
  const existingLog = await db.dailyLogs.get(todayStr);
  if (!existingLog) {
    await db.dailyLogs.put({
      date: todayStr,
      sleepHours: 7.5,
      sleepQuality: 8,
      bedtime: '22:30',
      wakeTime: '06:30',
      morningLightMinutes: 15,
      morningHydrationDone: true,
      morningCoffeeDone: true,
      eveningWindDownDone: false,
      subjectiveEnergy: 8,
      subjectiveRecovery: 8,
      updatedAt: new Date().toISOString()
    });
  }

  // Asigură că rezultatele de laborator existente au alerte calculate și persistate cu noua structură decuplată
  const existingResults = await db.labResults.toArray();
  const allBios = await db.biomarkerDefinitions.toArray();
  const primaryProfile = await db.userProfile.get('primary_user');
  for (const r of existingResults) {
    if (!r.alert || !r.alert.clinicalAssessment) {
      const bio = allBios.find(b => b.id === r.biomarkerId);
      if (bio) {
        const evaluatedAlert = evaluateLabResultAlert({
          result: r,
          biomarker: bio,
          userProfile: primaryProfile
        });
        await db.labResults.update(r.id, { alert: evaluatedAlert });
      }
    }
  }
}

/**
 * Verifică integritatea și persistența locală IndexedDB
 */
export async function verifyPersistence(): Promise<{
  verified: boolean;
  totalRecords: number;
  lastSaved: string;
  isOpen: boolean;
}> {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
    const profile = await db.userProfile.get('primary_user');
    const counts = await getRecordCounts();
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      verified: !!profile && totalRecords > 0,
      totalRecords,
      lastSaved: profile?.updatedAt || new Date().toISOString(),
      isOpen: db.isOpen()
    };
  } catch (err) {
    console.error('Eroare verificare persistență IndexedDB:', err);
    return {
      verified: false,
      totalRecords: 0,
      lastSaved: '',
      isOpen: false
    };
  }
}

/**
 * Calculează numărul de înregistrări pe fiecare tabelă
 */
export async function getRecordCounts(): Promise<Record<string, number>> {
  const [
    dailyLogs,
    mealEntries,
    foodItems,
    supplementIntakes,
    workoutSessions,
    bodyMeasurements,
    labResults,
    labDocuments,
    aiInsights,
    experimentalInterventions,
    protocolVersions,
    supplementProductVersions
  ] = await Promise.all([
    db.dailyLogs.count(),
    db.mealEntries.count(),
    db.foodItems.count(),
    db.supplementIntakes.count(),
    db.workoutSessions.count(),
    db.bodyMeasurements.count(),
    db.labResults.count(),
    db.labDocuments.count(),
    db.aiInsights.count(),
    db.experimentalInterventions.count(),
    db.protocolVersions.count(),
    db.supplementProductVersions.count()
  ]);

  return {
    dailyLogs,
    mealEntries,
    foodItems,
    supplementIntakes,
    workoutSessions,
    bodyMeasurements,
    labResults,
    labDocuments,
    aiInsights,
    experimentalInterventions,
    protocolVersions,
    supplementProductVersions
  };
}

/**
 * Obține spațiul de stocare utilizat de IndexedDB (Storage API)
 */
export async function getStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
}> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usageFormatted = usage > 1024 * 1024
        ? `${(usage / (1024 * 1024)).toFixed(2)} MB`
        : `${(usage / 1024).toFixed(1)} KB`;
      return { usageBytes: usage, quotaBytes: quota, usageFormatted };
    } catch {
      // Fallback
    }
  }
  return { usageBytes: 0, quotaBytes: 0, usageFormatted: 'N/A' };
}

/**
 * Exportă toate datele din IndexedDB într-un payload structurat JSON
 */
export async function exportAllData(): Promise<ExportBackupPayload> {
  const profile = (await db.userProfile.get('primary_user')) || DEFAULT_USER_PROFILE;
  const dailyLogs = await db.dailyLogs.toArray();
  const mealEntries = await db.mealEntries.toArray();
  const foodItems = await db.foodItems.toArray();
  const supplementIntakes = await db.supplementIntakes.toArray();
  const workoutSessions = await db.workoutSessions.toArray();
  const bodyMeasurements = await db.bodyMeasurements.toArray();
  const labResults = await db.labResults.toArray();
  const labDocuments = await db.labDocuments.toArray();
  const aiInsights = await db.aiInsights.toArray();
  const experimentalInterventions = await db.experimentalInterventions.toArray();
  const protocolVersions = await db.protocolVersions.toArray();
  const supplementProductVersions = await db.supplementProductVersions.toArray();

  return {
    version: '3.2.0',
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    app: 'Longevity 3.2 — Personal Healthspan OS',
    userProfile: profile,
    dailyLogs,
    mealEntries,
    foodItems,
    supplementIntakes,
    workoutSessions,
    bodyMeasurements,
    labResults,
    labDocuments,
    aiInsights,
    experimentalInterventions,
    protocolVersions,
    supplementProductVersions
  };
}

/**
 * Verifică integritatea unui payload de backup înainte de restaurare
 */
export function verifyBackupIntegrity(payload: unknown): {
  valid: boolean;
  errors: string[];
  recordCounts: Record<string, number>;
} {
  const errors: string[] = [];
  const recordCounts: Record<string, number> = {};

  if (!payload || typeof payload !== 'object') {
    errors.push('Fișierul nu conține un obiect JSON valid.');
    return { valid: false, errors, recordCounts };
  }

  const p = payload as Partial<ExportBackupPayload>;

  if (p.app !== 'Longevity 3.2 — Personal Healthspan OS') {
    errors.push('Antetul aplicației nu se potrivește: așteptat "Longevity 3.2 — Personal Healthspan OS".');
  }

  if (!p.userProfile || p.userProfile.id !== 'primary_user') {
    errors.push('Profilul utilizatorului lipsește sau este invalid.');
  }

  recordCounts.dailyLogs = Array.isArray(p.dailyLogs) ? p.dailyLogs.length : 0;
  recordCounts.mealEntries = Array.isArray(p.mealEntries) ? p.mealEntries.length : 0;
  recordCounts.supplementIntakes = Array.isArray(p.supplementIntakes) ? p.supplementIntakes.length : 0;
  recordCounts.workoutSessions = Array.isArray(p.workoutSessions) ? p.workoutSessions.length : 0;
  recordCounts.bodyMeasurements = Array.isArray(p.bodyMeasurements) ? p.bodyMeasurements.length : 0;
  recordCounts.labResults = Array.isArray(p.labResults) ? p.labResults.length : 0;
  recordCounts.aiInsights = Array.isArray(p.aiInsights) ? p.aiInsights.length : 0;
  recordCounts.supplementProductVersions = Array.isArray(p.supplementProductVersions) ? p.supplementProductVersions.length : 0;

  return {
    valid: errors.length === 0,
    errors,
    recordCounts
  };
}

/**
 * Importă și restaurează date dintr-un payload JSON cu verificare de schemă
 */
export async function importDataPayload(payload: ExportBackupPayload): Promise<void> {
  const verification = verifyBackupIntegrity(payload);
  if (!verification.valid) {
    throw new Error(`Verificarea integrității a eșuat: ${verification.errors.join(', ')}`);
  }

  await db.transaction('rw', [
    db.userProfile,
    db.dailyLogs,
    db.mealEntries,
    db.foodItems,
    db.supplementIntakes,
    db.workoutSessions,
    db.bodyMeasurements,
    db.labResults,
    db.labDocuments,
    db.aiInsights,
    db.experimentalInterventions,
    db.protocolVersions,
    db.supplementProductVersions
  ], async () => {
    if (payload.userProfile) await db.userProfile.put(payload.userProfile);
    if (payload.dailyLogs?.length) await db.dailyLogs.bulkPut(payload.dailyLogs);
    if (payload.mealEntries?.length) await db.mealEntries.bulkPut(payload.mealEntries);
    if (payload.foodItems?.length) await db.foodItems.bulkPut(payload.foodItems);
    if (payload.supplementIntakes?.length) await db.supplementIntakes.bulkPut(payload.supplementIntakes);
    if (payload.workoutSessions?.length) await db.workoutSessions.bulkPut(payload.workoutSessions);
    if (payload.bodyMeasurements?.length) await db.bodyMeasurements.bulkPut(payload.bodyMeasurements);
    if (payload.labResults?.length) await db.labResults.bulkPut(payload.labResults);
    if (payload.labDocuments?.length) await db.labDocuments.bulkPut(payload.labDocuments);
    if (payload.aiInsights?.length) await db.aiInsights.bulkPut(payload.aiInsights);
    if (payload.experimentalInterventions?.length) await db.experimentalInterventions.bulkPut(payload.experimentalInterventions);
    if (payload.protocolVersions?.length) await db.protocolVersions.bulkPut(payload.protocolVersions);
    if (payload.supplementProductVersions?.length) await db.supplementProductVersions.bulkPut(payload.supplementProductVersions);
  });
}

/**
 * Criptare AES-GCM (Web Crypto API) bazată pe parolă utilizator
 * Folosește PBKDF2 cu salt aleatoriu de 16 octeți și IV de 12 octeți.
 * Nu stochează parola sau cheia brută niciodată.
 */
export async function encryptBackupWithPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('Parola trebuie să aibă cel puțin 6 caractere.');
  }

  const data = await exportAllData();
  const plainText = JSON.stringify(data);
  const enc = new TextEncoder();
  const plainBytes = enc.encode(plainText);

  // Generate 16 bytes salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  // Key derivation PBKDF2
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plainBytes
  );

  // Package as JSON with salt, iv, and ciphertext in base64
  const packageObj = {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    meta: 'LONGEVITY_3.2_ENCRYPTED_BACKUP',
    algorithm: 'AES-GCM-256-PBKDF2',
    timestamp: new Date().toISOString()
  };

  return JSON.stringify(packageObj, null, 2);
}

/**
 * Decriptare AES-GCM cu parola utilizatorului
 */
export async function decryptAndRestoreWithPassword(encryptedJsonStr: string, password: string): Promise<void> {
  if (!password) {
    throw new Error('Parola este obligatorie pentru decriptare.');
  }

  const packageObj = JSON.parse(encryptedJsonStr);
  if (packageObj.meta !== 'LONGEVITY_3.2_ENCRYPTED_BACKUP') {
    throw new Error('Formatul fișierului criptat nu este recunoscut de Longevity 3.2.');
  }

  const salt = Uint8Array.from(atob(packageObj.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(packageObj.iv), c => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(packageObj.ciphertext), c => c.charCodeAt(0));

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  let decryptedBytes: ArrayBuffer;
  try {
    decryptedBytes = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );
  } catch {
    throw new Error('Parolă incorectă sau fișier corupt. Autentificarea decriptării a eșuat.');
  }

  const dec = new TextDecoder();
  const plainJson = dec.decode(decryptedBytes);
  const payload: ExportBackupPayload = JSON.parse(plainJson);
  await importDataPayload(payload);
}

/**
 * Șterge selectiv înregistrări dintr-o categorie
 */
export async function deleteSelectedRecords(
  category: 'meals' | 'workouts' | 'supplements' | 'measurements' | 'aiInsights' | 'labs',
  options?: { beforeDate?: string }
): Promise<number> {
  let count = 0;
  if (category === 'meals') {
    if (options?.beforeDate) {
      const records = await db.mealEntries.where('date').below(options.beforeDate).toArray();
      count = records.length;
      await db.mealEntries.bulkDelete(records.map(r => r.id));
    } else {
      count = await db.mealEntries.count();
      await db.mealEntries.clear();
    }
  } else if (category === 'workouts') {
    if (options?.beforeDate) {
      const records = await db.workoutSessions.where('date').below(options.beforeDate).toArray();
      count = records.length;
      await db.workoutSessions.bulkDelete(records.map(r => r.id));
    } else {
      count = await db.workoutSessions.count();
      await db.workoutSessions.clear();
    }
  } else if (category === 'supplements') {
    if (options?.beforeDate) {
      const records = await db.supplementIntakes.where('date').below(options.beforeDate).toArray();
      count = records.length;
      await db.supplementIntakes.bulkDelete(records.map(r => r.id));
    } else {
      count = await db.supplementIntakes.count();
      await db.supplementIntakes.clear();
    }
  } else if (category === 'measurements') {
    if (options?.beforeDate) {
      const records = await db.bodyMeasurements.where('date').below(options.beforeDate).toArray();
      count = records.length;
      await db.bodyMeasurements.bulkDelete(records.map(r => r.id));
    } else {
      count = await db.bodyMeasurements.count();
      await db.bodyMeasurements.clear();
    }
  } else if (category === 'aiInsights') {
    if (options?.beforeDate) {
      const records = await db.aiInsights.where('date').below(options.beforeDate).toArray();
      count = records.length;
      await db.aiInsights.bulkDelete(records.map(r => r.id));
    } else {
      count = await db.aiInsights.count();
      await db.aiInsights.clear();
    }
  } else if (category === 'labs') {
    count = await db.labResults.count();
    await db.labResults.clear();
  }
  return count;
}

/**
 * Șterge toate datele locale (Full Wipe) și reinițializează doar schemele protocolului
 */
export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', [
    db.userProfile,
    db.dailyLogs,
    db.mealEntries,
    db.foodItems,
    db.supplementDefinitions,
    db.supplementIntakes,
    db.workoutSessions,
    db.bodyMeasurements,
    db.biomarkerDefinitions,
    db.labResults,
    db.labDocuments,
    db.aiInsights,
    db.experimentalInterventions,
    db.protocolVersions,
    db.supplementProductVersions
  ], async () => {
    await db.userProfile.clear();
    await db.dailyLogs.clear();
    await db.mealEntries.clear();
    await db.foodItems.clear();
    await db.supplementDefinitions.clear();
    await db.supplementIntakes.clear();
    await db.workoutSessions.clear();
    await db.bodyMeasurements.clear();
    await db.biomarkerDefinitions.clear();
    await db.labResults.clear();
    await db.labDocuments.clear();
    await db.aiInsights.clear();
    await db.experimentalInterventions.clear();
    await db.protocolVersions.clear();
    await db.supplementProductVersions.clear();
  });

  await initializeDatabase();
}

/**
 * Șterge datele tranzitorii introduse păstrând protocoalele
 */
export async function resetUserDataToCleanSlate(): Promise<void> {
  await db.mealEntries.clear();
  await db.supplementIntakes.clear();
  await db.workoutSessions.clear();
  await db.bodyMeasurements.clear();
  await db.labResults.clear();
  await db.labDocuments.clear();
  await db.aiInsights.clear();
  await initializeDatabase();
}

export interface ReplaceBrandParams {
  supplementId: string;
  brandName: string;
  productName: string;
  form: string;
  servingSize: string;
  activeIngredients: string;
  concentrationPerServing: string;
  labelNotes?: string;
  photoDataUrl?: string;
  effectiveStartDate: string;
  concentrationChangeWarning?: string;
}

/**
 * Înlocuiește brandul unui supliment conform regulilor de guvernanță:
 * 1. Arhivează produsul anterior fără a șterge istoricul sau administrările anterioare.
 * 2. Înregistrează noul produs cu link către suplimentul din protocol.
 * 3. Actualizează profilul suplimentului activ cu noile specificații și semnalizează modificările de concentrație.
 */
export async function replaceSupplementBrand(params: ReplaceBrandParams): Promise<SupplementProductVersion> {
  const newProductId = `prod_${params.supplementId}_${Date.now()}`;

  const newProduct: SupplementProductVersion = {
    id: newProductId,
    supplementId: params.supplementId,
    brandName: params.brandName.trim(),
    productName: params.productName.trim() || params.brandName.trim(),
    form: params.form.trim(),
    servingSize: params.servingSize.trim(),
    activeIngredients: params.activeIngredients.trim(),
    concentrationPerServing: params.concentrationPerServing.trim(),
    labelNotes: params.labelNotes?.trim(),
    photoDataUrl: params.photoDataUrl,
    effectiveStartDate: params.effectiveStartDate,
    isArchived: false,
    concentrationChangeWarning: params.concentrationChangeWarning,
    createdAt: new Date().toISOString()
  };

  await db.transaction('rw', [db.supplementDefinitions, db.supplementProductVersions], async () => {
    // 1. Găsește produsul curent activ și arhivează-l cu data de sfârșit
    const previousActive = await db.supplementProductVersions
      .where('supplementId')
      .equals(params.supplementId)
      .filter(p => !p.isArchived)
      .toArray();

    for (const prev of previousActive) {
      await db.supplementProductVersions.update(prev.id, {
        isArchived: true,
        effectiveEndDate: params.effectiveStartDate
      });
    }

    // 2. Adaugă noul produs
    await db.supplementProductVersions.put(newProduct);

    // 3. Actualizează definiția suplimentului
    await db.supplementDefinitions.update(params.supplementId, {
      currentProductId: newProduct.id,
      currentBrandName: newProduct.brandName,
      currentProductName: newProduct.productName,
      currentForm: newProduct.form,
      currentServingSize: newProduct.servingSize,
      currentConcentration: newProduct.concentrationPerServing,
      currentPhotoDataUrl: newProduct.photoDataUrl,
      concentrationReviewFlag: params.concentrationChangeWarning
    });
  });

  return newProduct;
}

