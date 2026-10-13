import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseReferenceIntervalString,
  compareValueToInterval,
  checkUnitCompatibility,
  evaluateLabResultAlert,
  getActiveAlerts,
  isBiomarkerAlertEnabled
} from '../utils/labAlertsEngine.ts';
import { BiomarkerDefinition, LabResult, UserProfile } from '../types/protocol.ts';
import { PROTOCOL_BIOMARKERS, DEFAULT_USER_PROFILE, PROTOCOL_SUPPLEMENTS } from '../data/protocolData.ts';
import { verifyBackupIntegrity } from '../db/index.ts';

describe('Longevity 3.2 — Lab Tests Clinical Safety Remediation Suite', () => {
  const getBiomarker = (id: string): BiomarkerDefinition => {
    const b = PROTOCOL_BIOMARKERS.find(bio => bio.id === id);
    if (!b) throw new Error(`Biomarker ${id} not found`);
    return b;
  };

  // 1. Regresie: TG 800 mg/dL cu notificările dezactivate
  it('identifică corect valoarea critică TG 800 mg/dL chiar și când notificările sunt dezactivate', () => {
    const tgBio = getBiomarker('triglycerides');
    const userProfileNotificationsDisabled: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      biomarkerAlertPreferences: {
        triglycerides: {
          biomarkerId: 'triglycerides',
          enabled: false
        }
      }
    };

    const alert = evaluateLabResultAlert({
      result: {
        id: 'res_tg_800',
        biomarkerId: 'triglycerides',
        testDate: '2026-10-12',
        value: 800,
        unit: 'mg/dL',
        referenceInterval: '< 150 mg/dL',
        laboratory: 'Synevo'
      },
      biomarker: tgBio,
      userProfile: userProfileNotificationsDisabled
    });

    // Evaluarea clinică rămâne intactă (Cerința 1 & 5)
    assert.strictEqual(alert.severity, 'valoare_critica');
    assert.strictEqual(alert.isCritical, true);
    assert.strictEqual(alert.direction, 'high');
    assert.strictEqual(alert.clinicalAssessment.severity, 'valoare_critica');
    assert.strictEqual(alert.clinicalAssessment.isCritical, true);
    assert.strictEqual(alert.clinicalAssessment.clinicalContext, 'urgenta_imediata');

    // Preferința utilizatorului este respectată
    assert.strictEqual(alert.notificationEnabled, false);
    // Pentru valoare critică de urgență vitală, siguranța impune vizibilitatea indicatorului
    assert.strictEqual(alert.notificationVisible, true);
  });

  // 2. Regresie: ApoB 75 mg/dL, țintă personală < 65 și interval laborator < 100
  it('clasifică ApoB 75 mg/dL ca abatere ușoară (nu evaluare medicală) când este sub intervalul laboratorului (< 100)', () => {
    const apobBio = getBiomarker('apob');
    // optimMax = 65, clinicalRefMax = 100
    const alert = evaluateLabResultAlert({
      result: {
        id: 'res_apob_75',
        biomarkerId: 'apob',
        testDate: '2026-10-12',
        value: 75,
        unit: 'mg/dL',
        referenceInterval: '< 100 mg/dL',
        laboratory: 'Synevo'
      },
      biomarker: apobBio
    });

    assert.strictEqual(alert.severity, 'abatere_usoara');
    assert.strictEqual(alert.direction, 'high');
    assert.strictEqual(alert.isCritical, false);
    assert.match(alert.title, /Abatere Ușoară/i);
    assert.match(alert.message, /intervalul normal al laboratorului/i);
  });

  // 3. Regresie: Interval < 100 fără limită inferioară inventată
  it('păstrează limita inferioară undefined pentru < 100 și nu inventează 0', () => {
    const parsed = parseReferenceIntervalString('< 100 mg/dL');
    assert.strictEqual(parsed.parsed, true);
    assert.strictEqual(parsed.max, 100);
    assert.strictEqual(parsed.maxInclusive, false);
    assert.strictEqual(parsed.min, undefined);
    assert.strictEqual(parsed.minInclusive, undefined);

    // Valoarea 20 mg/dL nu este marcată eronat sub limită când intervalul specifică doar < 100
    const comp = compareValueToInterval(20, parsed);
    assert.strictEqual(comp.isBelow, false);
    assert.strictEqual(comp.isAbove, false);
    assert.strictEqual(comp.isInRange, true);
  });

  // 4. Regresie: Operatori < versus ≤ și > versus ≥
  it('respectă cu strictețe diferența dintre operatorii inclusivi și exclusivi', () => {
    // Exclusiv < 100
    const strictlyLess = parseReferenceIntervalString('< 100');
    assert.strictEqual(strictlyLess.maxInclusive, false);
    assert.strictEqual(compareValueToInterval(100, strictlyLess).isAbove, true);
    assert.strictEqual(compareValueToInterval(99.9, strictlyLess).isInRange, true);

    // Inclusiv <= 100 / ≤ 100
    const lessOrEqual1 = parseReferenceIntervalString('<= 100');
    const lessOrEqual2 = parseReferenceIntervalString('≤ 100');
    assert.strictEqual(lessOrEqual1.maxInclusive, true);
    assert.strictEqual(lessOrEqual2.maxInclusive, true);
    assert.strictEqual(compareValueToInterval(100, lessOrEqual1).isInRange, true);
    assert.strictEqual(compareValueToInterval(100.1, lessOrEqual1).isAbove, true);

    // Exclusiv > 40
    const strictlyGreater = parseReferenceIntervalString('> 40');
    assert.strictEqual(strictlyGreater.minInclusive, false);
    assert.strictEqual(compareValueToInterval(40, strictlyGreater).isBelow, true);
    assert.strictEqual(compareValueToInterval(40.1, strictlyGreater).isInRange, true);

    // Inclusiv >= 40 / ≥ 40
    const greaterOrEqual1 = parseReferenceIntervalString('>= 40');
    const greaterOrEqual2 = parseReferenceIntervalString('≥ 40');
    assert.strictEqual(greaterOrEqual1.minInclusive, true);
    assert.strictEqual(greaterOrEqual2.minInclusive, true);
    assert.strictEqual(compareValueToInterval(40, greaterOrEqual1).isInRange, true);
    assert.strictEqual(compareValueToInterval(39.9, greaterOrEqual1).isBelow, true);
  });

  // 5. Regresie: TG 1.5 g/L = 150 mg/dL (conversie dimensională masică)
  it('convertește corect dimensional 1.5 g/L în 150 mg/dL (factor 100)', () => {
    const conv = checkUnitCompatibility('g/L', 'mg/dL', 1.5, 'triglycerides');
    assert.strictEqual(conv.compatible, true);
    assert.strictEqual(conv.convertedValue, 150);

    const convApoB = checkUnitCompatibility('g/L', 'mg/dL', 0.85, 'apob');
    assert.strictEqual(convApoB.compatible, true);
    assert.strictEqual(convApoB.convertedValue, 85);
  });

  // 6. Regresie: Conversii mmol/L
  it('convertește riguros trigliceridele din mmol/L în mg/dL conform masei moleculare (factor 88.57)', () => {
    const conv = checkUnitCompatibility('mmol/L', 'mg/dL', 1.0, 'triglycerides');
    assert.strictEqual(conv.compatible, true);
    assert.strictEqual(conv.convertedValue, 88.6);

    const conv2 = checkUnitCompatibility('mmol/L', 'mg/dL', 5.65, 'triglycerides');
    assert.strictEqual(conv2.compatible, true);
    // 5.65 * 88.57 = 500.4 mg/dL
    assert.strictEqual(conv2.convertedValue >= 500, true);
  });

  // 7. Regresie: Unități incompatibile
  it('blochează clasificarea numerică pentru unități incompatibile și oferă motiv explicit', () => {
    const apobBio = getBiomarker('apob');
    const alert = evaluateLabResultAlert({
      result: {
        id: 'res_invalid_unit',
        biomarkerId: 'apob',
        testDate: '2026-10-12',
        value: 75,
        unit: '%', // Incompatibil
        referenceInterval: '< 100'
      },
      biomarker: apobBio
    });

    assert.strictEqual(alert.severity, 'unitate_incompatibila');
    assert.strictEqual(alert.direction, 'unknown');
    assert.strictEqual(alert.isCritical, false);
    assert.match(alert.message, /nu este compatibilă dimensional/i);
    assert.strictEqual(alert.clinicalAssessment.clinicalContext, 'reevaluare_confirmare');
  });

  // 8. Regresie: Absența unui prag clinic documentat și revizuirea proporțională (Cerința 5)
  it('nu clasifică eronat ca valoare_critica biomarkerii cronici fără risc vital imediat (HbA1c, hs-CRP, Vit D, HCY, ApoB)', () => {
    // HbA1c 11.5% -> evaluare_medicala promptă, nu urgență vitală acută
    const hba1cBio = getBiomarker('hba1c');
    const alertHb = evaluateLabResultAlert({
      result: {
        id: 'res_hb_high',
        biomarkerId: 'hba1c',
        testDate: '2026-10-12',
        value: 11.5,
        unit: '%',
        referenceInterval: '< 5.7 %'
      },
      biomarker: hba1cBio
    });
    assert.strictEqual(alertHb.severity, 'evaluare_medicala');
    assert.strictEqual(alertHb.isCritical, false);
    assert.strictEqual(alertHb.clinicalAssessment.clinicalContext, 'evaluare_medicala_prompta');

    // hs-CRP 14.0 mg/L -> evaluare_medicala (reacție inflamatorie acută intercurentă conform CDC/AHA)
    const crpBio = getBiomarker('hscrp');
    const alertCRP = evaluateLabResultAlert({
      result: {
        id: 'res_crp_14',
        biomarkerId: 'hscrp',
        testDate: '2026-10-12',
        value: 14.0,
        unit: 'mg/L',
        referenceInterval: '< 3.0 mg/L'
      },
      biomarker: crpBio
    });
    assert.strictEqual(alertCRP.severity, 'evaluare_medicala');
    assert.strictEqual(alertCRP.isCritical, false);
    assert.strictEqual(alertCRP.clinicalAssessment.clinicalContext, 'reevaluare_confirmare');

    // Vitamina D 7.5 ng/mL -> evaluare_medicala promptă
    const vitDBio = getBiomarker('vitamin_d');
    const alertVitD = evaluateLabResultAlert({
      result: {
        id: 'res_vitd_7',
        biomarkerId: 'vitamin_d',
        testDate: '2026-10-12',
        value: 7.5,
        unit: 'ng/mL',
        referenceInterval: '30 - 100 ng/mL'
      },
      biomarker: vitDBio
    });
    assert.strictEqual(alertVitD.severity, 'evaluare_medicala');
    assert.strictEqual(alertVitD.isCritical, false);

    // Homocisteină 35 µmol/L -> evaluare_medicala promptă
    const hcyBio = getBiomarker('homocysteine');
    const alertHCY = evaluateLabResultAlert({
      result: {
        id: 'res_hcy_35',
        biomarkerId: 'homocysteine',
        testDate: '2026-10-12',
        value: 35.0,
        unit: 'µmol/L',
        referenceInterval: '5 - 15 µmol/L'
      },
      biomarker: hcyBio
    });
    assert.strictEqual(alertHCY.severity, 'evaluare_medicala');
    assert.strictEqual(alertHCY.isCritical, false);

    // ApoB 155 mg/dL -> evaluare_medicala
    const apobBio = getBiomarker('apob');
    const alertApoB = evaluateLabResultAlert({
      result: {
        id: 'res_apob_155',
        biomarkerId: 'apob',
        testDate: '2026-10-12',
        value: 155,
        unit: 'mg/dL',
        referenceInterval: '< 100 mg/dL'
      },
      biomarker: apobBio
    });
    assert.strictEqual(alertApoB.severity, 'evaluare_medicala');
    assert.strictEqual(alertApoB.isCritical, false);
  });

  // 9. Regresie: Migrare și restaurare backup
  it('validează integritatea structurii de backup cu noua schemă de alertă decuplată', () => {
    const mockBackupPayload = {
      app: 'Longevity 3.2 — Personal Healthspan OS',
      version: '3.2.0',
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      userProfile: {
        ...DEFAULT_USER_PROFILE,
        biomarkerAlertPreferences: {
          apob: { biomarkerId: 'apob', enabled: false }
        }
      },
      dailyLogs: [],
      mealEntries: [],
      foodItems: [],
      supplementIntakes: [],
      workoutSessions: [],
      bodyMeasurements: [],
      labResults: [
        {
          id: 'res_backup_1',
          biomarkerId: 'apob',
          testDate: '2026-10-12',
          value: 70,
          unit: 'mg/dL',
          referenceInterval: '< 100 mg/dL',
          laboratory: 'Synevo',
          createdAt: new Date().toISOString(),
          alert: {
            id: 'alert_res_backup_1',
            resultId: 'res_backup_1',
            biomarkerId: 'apob',
            biomarkerCode: 'ApoB',
            biomarkerName: 'Apolipoproteina B',
            testDate: '2026-10-12',
            value: 70,
            unit: 'mg/dL',
            direction: 'high',
            severity: 'abatere_usoara',
            title: 'Abatere Ușoară',
            message: 'Peste optim',
            referenceUsed: '< 100 mg/dL',
            isCritical: false,
            notificationEnabled: false,
            notificationVisible: false,
            clinicalAssessment: {
              severity: 'abatere_usoara',
              direction: 'high',
              isCritical: false,
              title: 'Abatere Ușoară',
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
      supplementProductVersions: []
    };

    const integrity = verifyBackupIntegrity(mockBackupPayload);
    assert.strictEqual(integrity.valid, true);
    assert.strictEqual(integrity.recordCounts.labResults, 1);
  });

  // 10. Regresie: Clasificare clinică independentă de notificări
  it('garantează că evaluarea clinică produce rezultate identice indiferent de starea notificărilor', () => {
    const apobBio = getBiomarker('apob');
    const resultData = {
      id: 'res_apob_test',
      biomarkerId: 'apob',
      testDate: '2026-10-12',
      value: 125,
      unit: 'mg/dL',
      referenceInterval: '< 100 mg/dL',
      laboratory: 'Synevo'
    };

    const alertNotificationsOn = evaluateLabResultAlert({
      result: resultData,
      biomarker: apobBio,
      userProfile: {
        ...DEFAULT_USER_PROFILE,
        biomarkerAlertPreferences: {
          apob: { biomarkerId: 'apob', enabled: true }
        }
      }
    });

    const alertNotificationsOff = evaluateLabResultAlert({
      result: resultData,
      biomarker: apobBio,
      userProfile: {
        ...DEFAULT_USER_PROFILE,
        biomarkerAlertPreferences: {
          apob: { biomarkerId: 'apob', enabled: false }
        }
      }
    });

    // Toate atributele clinice sunt identice
    assert.strictEqual(alertNotificationsOn.severity, alertNotificationsOff.severity);
    assert.strictEqual(alertNotificationsOn.direction, alertNotificationsOff.direction);
    assert.strictEqual(alertNotificationsOn.isCritical, alertNotificationsOff.isCritical);
    assert.strictEqual(alertNotificationsOn.title, alertNotificationsOff.title);
    assert.strictEqual(alertNotificationsOn.message, alertNotificationsOff.message);
    assert.deepStrictEqual(alertNotificationsOn.clinicalAssessment, alertNotificationsOff.clinicalAssessment);

    // Singurele diferențe sunt flag-urile de prezentare/notificare a utilizatorului
    assert.strictEqual(alertNotificationsOn.notificationEnabled, true);
    assert.strictEqual(alertNotificationsOff.notificationEnabled, false);
    assert.strictEqual(alertNotificationsOn.notificationVisible, true);
    assert.strictEqual(alertNotificationsOff.notificationVisible, false);
  });

  // 11. Imuabilitate protocol și suplimente
  it('garantează că evaluarea alertelor nu alterează protocolul sau suplimentele', () => {
    const countBefore = PROTOCOL_SUPPLEMENTS.length;
    const tgBio = getBiomarker('triglycerides');

    evaluateLabResultAlert({
      result: {
        id: 'res_tg_danger',
        biomarkerId: 'triglycerides',
        testDate: '2026-10-12',
        value: 900,
        unit: 'mg/dL',
        referenceInterval: '< 150 mg/dL'
      },
      biomarker: tgBio
    });

    assert.strictEqual(PROTOCOL_SUPPLEMENTS.length, countBefore);
  });

  // 12. Deduplicare alerte active
  it('deduplicează alertele active per ID rezultat', () => {
    const mockResults: LabResult[] = [
      {
        id: 'res_dup',
        biomarkerId: 'apob',
        testDate: '2026-10-12',
        value: 110,
        unit: 'mg/dL',
        referenceInterval: '< 100 mg/dL',
        laboratory: 'Synevo',
        createdAt: '2026-10-12T10:00:00Z',
        alert: {
          id: 'alert_res_dup',
          resultId: 'res_dup',
          biomarkerId: 'apob',
          biomarkerCode: 'ApoB',
          biomarkerName: 'Apolipoproteina B',
          testDate: '2026-10-12',
          value: 110,
          unit: 'mg/dL',
          direction: 'high',
          severity: 'evaluare_medicala',
          title: 'ApoB crescut',
          message: 'Peste interval',
          referenceUsed: '< 100 mg/dL',
          isCritical: false,
          notificationEnabled: true,
          notificationVisible: true,
          clinicalAssessment: {
            severity: 'evaluare_medicala',
            direction: 'high',
            isCritical: false,
            title: 'ApoB crescut',
            message: 'Peste interval',
            referenceUsed: '< 100 mg/dL'
          },
          createdAt: new Date().toISOString()
        }
      },
      {
        id: 'res_dup', // Duplicate ID
        biomarkerId: 'apob',
        testDate: '2026-10-12',
        value: 110,
        unit: 'mg/dL',
        referenceInterval: '< 100 mg/dL',
        laboratory: 'Synevo',
        createdAt: '2026-10-12T10:00:00Z',
        alert: {
          id: 'alert_res_dup',
          resultId: 'res_dup',
          biomarkerId: 'apob',
          biomarkerCode: 'ApoB',
          biomarkerName: 'Apolipoproteina B',
          testDate: '2026-10-12',
          value: 110,
          unit: 'mg/dL',
          direction: 'high',
          severity: 'evaluare_medicala',
          title: 'ApoB crescut',
          message: 'Peste interval',
          referenceUsed: '< 100 mg/dL',
          isCritical: false,
          notificationEnabled: true,
          notificationVisible: true,
          clinicalAssessment: {
            severity: 'evaluare_medicala',
            direction: 'high',
            isCritical: false,
            title: 'ApoB crescut',
            message: 'Peste interval',
            referenceUsed: '< 100 mg/dL'
          },
          createdAt: new Date().toISOString()
        }
      }
    ];

    const active = getActiveAlerts(mockResults);
    assert.strictEqual(active.length, 1);
  });
});
