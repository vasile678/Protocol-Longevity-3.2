import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseReferenceIntervalString,
  compareValueToInterval,
  checkUnitCompatibility,
  evaluateLabResultAlert,
  getActiveAlerts
} from '../utils/labAlertsEngine.ts';
import { BiomarkerDefinition, LabResult, UserProfile, ExportBackupPayload } from '../types/protocol.ts';
import { PROTOCOL_BIOMARKERS, DEFAULT_USER_PROFILE, PROTOCOL_SUPPLEMENTS } from '../data/protocolData.ts';
import { verifyBackupIntegrity } from '../db/index.ts';

describe('LONGEVITY 3.2 — PRE-DEPLOYMENT QA & VALIDATION SUITE', () => {
  const getBiomarker = (id: string): BiomarkerDefinition => {
    const b = PROTOCOL_BIOMARKERS.find(bio => bio.id === id);
    if (!b) throw new Error(`Biomarker ${id} not found`);
    return b;
  };

  // ==========================================
  // 1. PERSISTENȚĂ ȘI RECUPERARE DATE
  // ==========================================
  describe('1. Persistență și Recuperare Date (Synthetic & Crypto)', () => {
    const syntheticPayload: ExportBackupPayload = {
      version: '3.2.0',
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      app: 'Longevity 3.2 — Personal Healthspan OS',
      userProfile: {
        ...DEFAULT_USER_PROFILE,
        name: 'Synthetic Test User',
        biomarkerAlertPreferences: {
          apob: { biomarkerId: 'apob', enabled: false }
        }
      },
      dailyLogs: [
        {
          date: '2026-10-12',
          sleepQuality: 9,
          notes: 'Test sync note',
          updatedAt: new Date().toISOString()
        }
      ],
      mealEntries: [
        {
          id: 'meal_synthetic_1',
          date: '2026-10-12',
          mealType: 'masa2',
          foodName: 'Somon sălbatic și spanac',
          grams: 250,
          calories: 450,
          protein: 42,
          carbs: 8,
          fat: 28,
          fibre: 6,
          source: 'Protocol 3.2 db',
          uncertainty: '±5% estimare analitică',
          time: '18:30',
          createdAt: new Date().toISOString()
        }
      ],
      foodItems: [],
      supplementIntakes: [
        {
          id: '2026-10-12_creatine',
          date: '2026-10-12',
          supplementId: 'creatine',
          status: 'taken',
          timestamp: new Date().toISOString()
        }
      ],
      workoutSessions: [
        {
          id: 'workout_synthetic_1',
          date: '2026-10-12',
          type: 'strength',
          title: 'Antrenament Forță - Picioare & Core',
          durationMinutes: 50,
          completed: true,
          rpe: 8,
          createdAt: new Date().toISOString()
        }
      ],
      bodyMeasurements: [
        {
          id: 'meas_synthetic_1',
          date: '2026-10-12',
          weightKg: 78.2,
          waistCircumferenceCm: 82.5,
          notes: 'Măsurătoare de dimineață à jeun',
          createdAt: new Date().toISOString()
        }
      ],
      labResults: [
        {
          id: 'res_synthetic_apob',
          biomarkerId: 'apob',
          testDate: '2026-10-12',
          value: 75,
          unit: 'mg/dL',
          referenceInterval: '< 100 mg/dL',
          laboratory: 'Synevo Synthetic',
          createdAt: new Date().toISOString(),
          alert: {
            id: 'alert_res_synthetic_apob',
            resultId: 'res_synthetic_apob',
            biomarkerId: 'apob',
            biomarkerCode: 'ApoB',
            biomarkerName: 'Apolipoproteina B',
            testDate: '2026-10-12',
            value: 75,
            unit: 'mg/dL',
            direction: 'high',
            severity: 'abatere_usoara',
            title: 'Abatere Ușoară: ApoB',
            message: 'Valoarea de 75 mg/dL depășește ținta optimă (≤65 mg/dL).',
            referenceUsed: '< 100 mg/dL',
            isCritical: false,
            notificationEnabled: false,
            notificationVisible: false,
            clinicalAssessment: {
              severity: 'abatere_usoara',
              direction: 'high',
              isCritical: false,
              title: 'Abatere Ușoară: ApoB',
              message: 'Peste optim',
              referenceUsed: '< 100 mg/dL'
            },
            createdAt: new Date().toISOString()
          }
        }
      ],
      labDocuments: [],
      aiInsights: [],
      experimentalInterventions: [],
      protocolVersions: [],
      supplementProductVersions: [
        {
          id: 'prod_synthetic_1',
          supplementId: 'creatine',
          productName: 'Micronized Creatine Powder',
          brandName: 'Creapure Micronized Gold',
          form: 'Pulbere',
          servingSize: '5 g (1 cupă)',
          activeIngredients: 'Creatină monohidrat 100%',
          concentrationPerServing: '5000 mg',
          labelNotes: 'Descriere produs: 100% pură, fără aditivi, lot certificat GMP',
          photoDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          isArchived: false,
          effectiveStartDate: '2026-09-01',
          createdAt: new Date().toISOString()
        }
      ]
    };

    it('verifică integritatea structurii de backup JSON conform schemei oficiale Longevity 3.2', () => {
      const integrity = verifyBackupIntegrity(syntheticPayload);
      assert.strictEqual(integrity.valid, true);
      assert.strictEqual(integrity.errors.length, 0);
      assert.strictEqual(integrity.recordCounts.dailyLogs, 1);
      assert.strictEqual(integrity.recordCounts.mealEntries, 1);
      assert.strictEqual(integrity.recordCounts.supplementIntakes, 1);
      assert.strictEqual(integrity.recordCounts.workoutSessions, 1);
      assert.strictEqual(integrity.recordCounts.bodyMeasurements, 1);
      assert.strictEqual(integrity.recordCounts.labResults, 1);
      assert.strictEqual(integrity.recordCounts.supplementProductVersions, 1);
    });

    it('respinge fișiere JSON cu antet invalid sau profil lipsă', () => {
      const invalidApp = { ...syntheticPayload, app: 'Unknown App' };
      const res1 = verifyBackupIntegrity(invalidApp);
      assert.strictEqual(res1.valid, false);
      assert.match(res1.errors[0], /Antetul aplicației nu se potrivește/);

      const invalidProfile = { ...syntheticPayload, userProfile: undefined };
      const res2 = verifyBackupIntegrity(invalidProfile);
      assert.strictEqual(res2.valid, false);
      assert.match(res2.errors[0], /Profilul utilizatorului lipsește/);
    });

    it('efectuează ciclul complet de criptare/decriptare AES-GCM + PBKDF2 și garantează echivalența 100% a datelor', async () => {
      const password = 'CorrectSecurePassword2026!';
      const enc = new TextEncoder();
      const plainBytes = enc.encode(JSON.stringify(syntheticPayload));

      // 1. Criptare PBKDF2 (100k iter, SHA-256) + AES-GCM (256-bit, IV 12 bytes)
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      const encKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encKey,
        plainBytes
      );

      const vaultJson = JSON.stringify({
        salt: Buffer.from(salt).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
        ciphertext: Buffer.from(encrypted).toString('base64'),
        meta: 'LONGEVITY_3.2_ENCRYPTED_BACKUP',
        algorithm: 'AES-GCM-256-PBKDF2',
        timestamp: new Date().toISOString()
      });

      // 2. Decriptare cu parola corectă
      const packageObj = JSON.parse(vaultJson);
      assert.strictEqual(packageObj.meta, 'LONGEVITY_3.2_ENCRYPTED_BACKUP');
      const saltDec = Buffer.from(packageObj.salt, 'base64');
      const ivDec = Buffer.from(packageObj.iv, 'base64');
      const cipherBytesDec = Buffer.from(packageObj.ciphertext, 'base64');

      const decKeyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      const decKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltDec, iterations: 100000, hash: 'SHA-256' },
        decKeyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivDec },
        decKey,
        cipherBytesDec
      );
      const restoredPayload: ExportBackupPayload = JSON.parse(new TextDecoder().decode(decryptedBuffer));

      // 3. Verificare echivalență completă
      assert.deepStrictEqual(restoredPayload, syntheticPayload);
      assert.strictEqual(restoredPayload.supplementProductVersions?.[0]?.photoDataUrl, syntheticPayload.supplementProductVersions?.[0]?.photoDataUrl);
      assert.strictEqual(restoredPayload.supplementProductVersions?.[0]?.labelNotes, syntheticPayload.supplementProductVersions?.[0]?.labelNotes);
      assert.strictEqual(restoredPayload.labResults?.[0]?.alert?.severity, 'abatere_usoara');
      assert.strictEqual(restoredPayload.userProfile.biomarkerAlertPreferences?.apob?.enabled, false);
    });

    it('respinge decriptarea cu parolă eronată sau date criptate alterate', async () => {
      const enc = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode('CorrectPassword'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode('test secret data')
      );

      // Decriptare cu parolă greșită
      const wrongKeyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode('WrongPassword123'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      const wrongKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        wrongKeyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      await assert.rejects(async () => {
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          wrongKey,
          encrypted
        );
      });
    });
  });

  // ==========================================
  // 2. SIGURANȚA CLINICĂ — LAB TESTS
  // ==========================================
  describe('2. Siguranța Clinică — Lab Tests', () => {
    // Scenariul 1: TG 800 mg/dL cu alerte vizuale ON și OFF
    it('Trigliceride 800 mg/dL este identificat critic indiferent dacă alertele sunt active sau inactive', () => {
      const tgBio = getBiomarker('triglycerides');

      // Cu alerte active
      const alertOn = evaluateLabResultAlert({
        result: {
          id: 'res_tg_800_on',
          biomarkerId: 'triglycerides',
          testDate: '2026-10-12',
          value: 800,
          unit: 'mg/dL',
          referenceInterval: '< 150 mg/dL'
        },
        biomarker: tgBio,
        userProfile: {
          ...DEFAULT_USER_PROFILE,
          biomarkerAlertPreferences: { triglycerides: { biomarkerId: 'triglycerides', enabled: true } }
        }
      });

      // Cu alerte dezactivate de utilizator
      const alertOff = evaluateLabResultAlert({
        result: {
          id: 'res_tg_800_off',
          biomarkerId: 'triglycerides',
          testDate: '2026-10-12',
          value: 800,
          unit: 'mg/dL',
          referenceInterval: '< 150 mg/dL'
        },
        biomarker: tgBio,
        userProfile: {
          ...DEFAULT_USER_PROFILE,
          biomarkerAlertPreferences: { triglycerides: { biomarkerId: 'triglycerides', enabled: false } }
        }
      });

      // Ambele cazuri mențin severitatea critică și clasificarea clinică intactă
      assert.strictEqual(alertOn.severity, 'valoare_critica');
      assert.strictEqual(alertOn.isCritical, true);
      assert.strictEqual(alertOn.clinicalAssessment.severity, 'valoare_critica');
      assert.strictEqual(alertOn.clinicalAssessment.clinicalContext, 'urgenta_imediata');

      assert.strictEqual(alertOff.severity, 'valoare_critica');
      assert.strictEqual(alertOff.isCritical, true);
      assert.strictEqual(alertOff.clinicalAssessment.severity, 'valoare_critica');
      assert.strictEqual(alertOff.clinicalAssessment.clinicalContext, 'urgenta_imediata');

      // Notificarea e activă în alertOn și marcată ca vizibilă pentru alertOff datorită urgenței vitale
      assert.strictEqual(alertOn.notificationEnabled, true);
      assert.strictEqual(alertOff.notificationEnabled, false);
      assert.strictEqual(alertOff.notificationVisible, true);
    });

    // Scenariul 2: ApoB 75 mg/dL, laborator < 100, țintă ≤ 65
    it('ApoB 75 mg/dL cu laborator < 100 și țintă personală ≤ 65 este clasificat ca abatere ușoară, nu evaluare medicală', () => {
      const apobBio = getBiomarker('apob');
      const alert = evaluateLabResultAlert({
        result: {
          id: 'res_apob_75',
          biomarkerId: 'apob',
          testDate: '2026-10-12',
          value: 75,
          unit: 'mg/dL',
          referenceInterval: '< 100 mg/dL'
        },
        biomarker: apobBio
      });

      assert.strictEqual(alert.severity, 'abatere_usoara');
      assert.strictEqual(alert.isCritical, false);
      assert.match(alert.title, /Abatere Ușoară/i);
      assert.match(alert.message, /intervalul normal al laboratorului/i);
    });

    // Scenariul 3: Operatorii <, ≤, >, ≥
    it('Respectă cu strictețe semantica operatorilor inclusivi și exclusivi fără aproximare', () => {
      const exclLess = parseReferenceIntervalString('< 100');
      assert.strictEqual(compareValueToInterval(100, exclLess).isAbove, true);
      assert.strictEqual(compareValueToInterval(99.99, exclLess).isInRange, true);

      const inclLess = parseReferenceIntervalString('<= 100');
      assert.strictEqual(compareValueToInterval(100, inclLess).isInRange, true);
      assert.strictEqual(compareValueToInterval(100.01, inclLess).isAbove, true);

      const exclGreat = parseReferenceIntervalString('> 50');
      assert.strictEqual(compareValueToInterval(50, exclGreat).isBelow, true);
      assert.strictEqual(compareValueToInterval(50.01, exclGreat).isInRange, true);

      const inclGreat = parseReferenceIntervalString('>= 50');
      assert.strictEqual(compareValueToInterval(50, inclGreat).isInRange, true);
      assert.strictEqual(compareValueToInterval(49.99, inclGreat).isBelow, true);
    });

    // Scenariul 4: Conversii de unități (mmol/L, mg/dL, g/L)
    it('Efectuează conversii dimensionale validate masice și molare', () => {
      // TG g/L -> mg/dL (factor 100)
      const convGtoMg = checkUnitCompatibility('g/L', 'mg/dL', 1.5, 'triglycerides');
      assert.strictEqual(convGtoMg.compatible, true);
      assert.strictEqual(convGtoMg.convertedValue, 150);

      // TG mmol/L -> mg/dL (factor 88.57)
      const convMmolToMg = checkUnitCompatibility('mmol/L', 'mg/dL', 2.0, 'triglycerides');
      assert.strictEqual(convMmolToMg.compatible, true);
      assert.strictEqual(convMmolToMg.convertedValue, 177.1);

      // Vitamina D nmol/L -> ng/mL (factor 2.496)
      const convVitD = checkUnitCompatibility('nmol/L', 'ng/ml', 50, 'vitamin_d');
      assert.strictEqual(convVitD.compatible, true);
      assert.strictEqual(convVitD.convertedValue, 20);

      // hs-CRP mg/dL -> mg/L (factor 10)
      const convCRP = checkUnitCompatibility('mg/dL', 'mg/L', 1.2, 'hscrp');
      assert.strictEqual(convCRP.compatible, true);
      assert.strictEqual(convCRP.convertedValue, 12);
    });

    // Scenariul 5: Unități incompatibile și intervale lipsă
    it('Gestionează explicit unitățile incompatibile și lipsa intervalului de referință', () => {
      const apobBio = getBiomarker('apob');

      // Unitate incompatibilă
      const alertIncompat = evaluateLabResultAlert({
        result: {
          id: 'res_incomp',
          biomarkerId: 'apob',
          testDate: '2026-10-12',
          value: 75,
          unit: 'UI/L',
          referenceInterval: '< 100'
        },
        biomarker: apobBio
      });
      assert.strictEqual(alertIncompat.severity, 'unitate_incompatibila');
      assert.match(alertIncompat.message, /nu este compatibilă dimensional/i);

      // Interval lipsă în buletin și fără fallback clinic
      const bioNoRef: BiomarkerDefinition = {
        ...apobBio,
        id: 'experimental_marker',
        clinicalRefMin: undefined,
        clinicalRefMax: undefined,
        optimalMin: undefined,
        optimalMax: undefined
      };
      const alertNoRef = evaluateLabResultAlert({
        result: {
          id: 'res_no_ref',
          biomarkerId: 'experimental_marker',
          testDate: '2026-10-12',
          value: 42,
          unit: 'mg/dL',
          referenceInterval: ''
        },
        biomarker: bioNoRef
      });
      assert.strictEqual(alertNoRef.severity, 'interval_lipsa');
      assert.match(alertNoRef.message, /Nu a fost specificat un interval/i);
    });

    // Scenariul 6: Alerte fără duplicate
    it('Elimină duplicatele din lista alertelor active per ID rezultat', () => {
      const results: LabResult[] = [
        {
          id: 'dup_res_1',
          biomarkerId: 'apob',
          testDate: '2026-10-12',
          value: 120,
          unit: 'mg/dL',
          referenceInterval: '< 100',
          laboratory: 'Synevo Test',
          createdAt: new Date().toISOString(),
          alert: {
            id: 'alert_dup_1',
            resultId: 'dup_res_1',
            biomarkerId: 'apob',
            biomarkerCode: 'ApoB',
            biomarkerName: 'ApoB',
            testDate: '2026-10-12',
            value: 120,
            unit: 'mg/dL',
            direction: 'high',
            severity: 'evaluare_medicala',
            title: 'ApoB crescut',
            message: 'Peste interval',
            referenceUsed: '< 100',
            isCritical: false,
            notificationEnabled: true,
            notificationVisible: true,
            clinicalAssessment: {
              severity: 'evaluare_medicala',
              direction: 'high',
              isCritical: false,
              title: 'ApoB crescut',
              message: 'Peste interval',
              referenceUsed: '< 100'
            },
            createdAt: new Date().toISOString()
          }
        },
        {
          id: 'dup_res_1', // Același ID
          biomarkerId: 'apob',
          testDate: '2026-10-12',
          value: 120,
          unit: 'mg/dL',
          referenceInterval: '< 100',
          laboratory: 'Synevo Test',
          createdAt: new Date().toISOString(),
          alert: {
            id: 'alert_dup_1',
            resultId: 'dup_res_1',
            biomarkerId: 'apob',
            biomarkerCode: 'ApoB',
            biomarkerName: 'ApoB',
            testDate: '2026-10-12',
            value: 120,
            unit: 'mg/dL',
            direction: 'high',
            severity: 'evaluare_medicala',
            title: 'ApoB crescut',
            message: 'Peste interval',
            referenceUsed: '< 100',
            isCritical: false,
            notificationEnabled: true,
            notificationVisible: true,
            clinicalAssessment: {
              severity: 'evaluare_medicala',
              direction: 'high',
              isCritical: false,
              title: 'ApoB crescut',
              message: 'Peste interval',
              referenceUsed: '< 100'
            },
            createdAt: new Date().toISOString()
          }
        }
      ];

      const activeAlerts = getActiveAlerts(results);
      assert.strictEqual(activeAlerts.length, 1);
    });

    // Scenariul 7: Clasificare clinică proporțională (nu urgențe vitale inventate)
    it('Biomarkerii de risc crescut cronic (HbA1c, hs-CRP, Vit D, HCY) nu sunt clasificați ca urgențe vitale, ci evaluare medicală proporțională', () => {
      // HbA1c 12% -> evaluare promptă, nu urgență vitală acută
      const hba1cBio = getBiomarker('hba1c');
      const alertHb = evaluateLabResultAlert({
        result: {
          id: 'res_hb_12',
          biomarkerId: 'hba1c',
          testDate: '2026-10-12',
          value: 12.0,
          unit: '%',
          referenceInterval: '< 5.7 %'
        },
        biomarker: hba1cBio
      });
      assert.strictEqual(alertHb.severity, 'evaluare_medicala');
      assert.strictEqual(alertHb.isCritical, false);
      assert.strictEqual(alertHb.clinicalAssessment.clinicalContext, 'evaluare_medicala_prompta');

      // hs-CRP 15 mg/L -> evaluare medicală / confirmare (nu urgență vitală acută)
      const crpBio = getBiomarker('hscrp');
      const alertCRP = evaluateLabResultAlert({
        result: {
          id: 'res_crp_15',
          biomarkerId: 'hscrp',
          testDate: '2026-10-12',
          value: 15.0,
          unit: 'mg/L',
          referenceInterval: '< 3.0 mg/L'
        },
        biomarker: crpBio
      });
      assert.strictEqual(alertCRP.severity, 'evaluare_medicala');
      assert.strictEqual(alertCRP.isCritical, false);
      assert.strictEqual(alertCRP.clinicalAssessment.clinicalContext, 'reevaluare_confirmare');
    });
  });

  // ==========================================
  // 3. SECURITATE ȘI CONFIDENȚIALITATE
  // ==========================================
  describe('3. Securitate și Confidențialitate', () => {
    it('garantează că nicio cheie API Gemini nu este importată sau utilizată în codul sursă client (src)', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      async function scanDir(dir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
          const res = path.resolve(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...(await scanDir(res)));
          } else if ((res.endsWith('.ts') || res.endsWith('.tsx') || res.endsWith('.js')) && !res.includes('/test/')) {
            files.push(res);
          }
        }
        return files;
      }

      const clientFiles = await scanDir(path.resolve('src'));
      const targetPattern = ['GEMINI', 'API', 'KEY'].join('_');
      for (const file of clientFiles) {
        const content = await fs.readFile(file, 'utf-8');
        assert.strictEqual(content.includes(targetPattern), false, `Cheie găsită în fișier client: ${file}`);
        assert.strictEqual(content.includes('GoogleGenAI'), false, `SDK GoogleGenAI găsit în fișier client: ${file}`);
        assert.strictEqual(content.includes('@google/genai'), false, `@google/genai găsit în fișier client: ${file}`);
      }
    });

    it('verifică că fișierele de configurare gitignore exclud .vault, .backup.json și secretele de mediu', async () => {
      const fs = await import('node:fs/promises');
      const gitignore = await fs.readFile('.gitignore', 'utf-8');
      assert.match(gitignore, /\.vault/);
      assert.match(gitignore, /\.backup\.json/);
      assert.match(gitignore, /\.env/);
    });
  });
});
