/**
 * LONGEVITY 3.2 — LAB TESTS ALERT & CLINICAL SAFETY ENGINE
 * Evaluates laboratory results against applicable reference intervals,
 * accounting for units, lab-specific ranges, and proportioned evidence-based thresholds.
 *
 * GOVERNANCE RULES:
 * 1. SEPARAREA EVALUĂRII CLINICE DE NOTIFICĂRI:
 *    Motorul evaluează întotdeauna rezultatul independent de preferința utilizatorului (alertsEnabled).
 *    Dezactivarea notificărilor opționale nu poate schimba severity, isCritical sau datele evaluării.
 * 2. PARSARE INTERVALE RIGUROASĂ:
 *    Pentru expresii '< X', '≤ X', '> X', '≥ X', limita opusă rămâne undefined (nu 0!).
 *    Se respectă strict operatorii inclusivi și exclusivi.
 * 3. CONVERSII DIMENSIONALE:
 *    g/L × 100 = mg/dL (conversie masică universală).
 *    Trigliceride: mmol/L × 88.57 ≈ mg/dL (masă moleculară trioleină).
 *    Unitățile necunoscute sau incompatibile blochează clasificarea numerică.
 * 4. REVIZUIRE PRAGURI CLINICE:
 *    Numai riscurile de urgență vitală imediată validate (ex: Trigliceride ≥ 500 mg/dL - pancreatită acută)
 *    primesc eticheta 'valoare_critica'. Biomarkerii cronici (HbA1c, hs-CRP, Vitamina D, Homocisteină)
 *    sunt evaluați proporțional cu eticheta 'evaluare_medicala' și documentare a limitărilor.
 */

import {
  BiomarkerDefinition,
  LabResult,
  LabResultAlert,
  LabAlertSeverity,
  LabAlertDirection,
  UserProfile,
  ClinicalAssessment
} from '../types/protocol';

export interface ParsedInterval {
  min?: number;
  max?: number;
  minInclusive?: boolean; // true pentru '>=', false pentru '>'
  maxInclusive?: boolean; // true pentru '<=', false pentru '<'
  parsed: boolean;
  raw: string;
}

export interface IntervalComparison {
  isBelow: boolean;
  isAbove: boolean;
  isInRange: boolean;
}

/**
 * Parsează un șir de interval de referință clinic (ex: "< 80", "≤ 100", "40 - 100", "0.2–1.0", ">= 40")
 * Păstrează limita opusă ca undefined (nu 0) pentru a evita inventarea de limite artificiale.
 */
export function parseReferenceIntervalString(rawInterval?: string): ParsedInterval {
  if (!rawInterval || !rawInterval.trim()) {
    return { parsed: false, raw: '' };
  }

  const clean = rawInterval.trim().toLowerCase();

  // Tratare intervale speciale textuale fără valori numerice
  if (
    clean === 'negativ' ||
    clean === 'absent' ||
    clean === 'non-reactiv' ||
    clean === '—' ||
    clean === '-' ||
    clean === 'nedetectabil'
  ) {
    return { parsed: false, raw: rawInterval };
  }

  // 1. Cazul <= X sau ≤ X (inclusiv)
  const lessOrEqualMatch = clean.match(/^(?:<=|≤)\s*([\d.]+)/);
  if (lessOrEqualMatch) {
    const maxVal = parseFloat(lessOrEqualMatch[1]);
    if (!isNaN(maxVal)) {
      return {
        max: maxVal,
        maxInclusive: true,
        parsed: true,
        raw: rawInterval
      };
    }
  }

  // 2. Cazul < X sau sub X sau până la X (exclusiv)
  const strictlyLessMatch = clean.match(/^(?:<|sub|până la)\s*([\d.]+)/);
  if (strictlyLessMatch) {
    const maxVal = parseFloat(strictlyLessMatch[1]);
    if (!isNaN(maxVal)) {
      return {
        max: maxVal,
        maxInclusive: false,
        parsed: true,
        raw: rawInterval
      };
    }
  }

  // 3. Cazul >= X sau ≥ X (inclusiv)
  const greaterOrEqualMatch = clean.match(/^(?:>=|≥)\s*([\d.]+)/);
  if (greaterOrEqualMatch) {
    const minVal = parseFloat(greaterOrEqualMatch[1]);
    if (!isNaN(minVal)) {
      return {
        min: minVal,
        minInclusive: true,
        parsed: true,
        raw: rawInterval
      };
    }
  }

  // 4. Cazul > X sau peste X (exclusiv)
  const strictlyGreaterMatch = clean.match(/^(?:>|peste)\s*([\d.]+)/);
  if (strictlyGreaterMatch) {
    const minVal = parseFloat(strictlyGreaterMatch[1]);
    if (!isNaN(minVal)) {
      return {
        min: minVal,
        minInclusive: false,
        parsed: true,
        raw: rawInterval
      };
    }
  }

  // 5. Cazul X - Y sau X–Y sau X to Y (interval închis standard laborator)
  const rangeMatch = clean.match(/([\d.]+)\s*(?:-|–|—|\.\.|to|și)\s*([\d.]+)/);
  if (rangeMatch) {
    const minVal = parseFloat(rangeMatch[1]);
    const maxVal = parseFloat(rangeMatch[2]);
    if (!isNaN(minVal) && !isNaN(maxVal)) {
      return {
        min: minVal,
        minInclusive: true,
        max: maxVal,
        maxInclusive: true,
        parsed: true,
        raw: rawInterval
      };
    }
  }

  return { parsed: false, raw: rawInterval };
}

/**
 * Compară o valoare numerică cu un interval parsat, respectând operatorii inclusivi și exclusivi
 */
export function compareValueToInterval(value: number, interval: ParsedInterval): IntervalComparison {
  if (!interval.parsed) {
    return { isBelow: false, isAbove: false, isInRange: true };
  }

  let isBelow = false;
  if (interval.min !== undefined) {
    if (interval.minInclusive) {
      if (value < interval.min) isBelow = true;
    } else {
      if (value <= interval.min) isBelow = true;
    }
  }

  let isAbove = false;
  if (interval.max !== undefined) {
    if (interval.maxInclusive) {
      if (value > interval.max) isAbove = true;
    } else {
      if (value >= interval.max) isAbove = true;
    }
  }

  return {
    isBelow,
    isAbove,
    isInRange: !isBelow && !isAbove
  };
}

/**
 * Standardizează și normalizează unitățile de măsură
 */
export function normalizeUnit(unitStr?: string): string {
  if (!unitStr) return '';
  return unitStr
    .trim()
    .toLowerCase()
    .replace(/μ/g, 'µ') // U+03BC greek mu -> U+00B5 micro sign
    .replace(/u(?=[i\w])/g, 'µ') // e.g. uiu/ml -> µiu/ml, umol -> µmol
    .replace(/\s+/g, '');
}

export interface UnitCompatibilityResult {
  compatible: boolean;
  convertedValue: number;
  conversionNote?: string;
  errorReason?: string;
}

/**
 * Verifică dimensional compatibilitatea unităților de măsură și aplică conversii validate.
 */
export function checkUnitCompatibility(
  resultUnit: string,
  biomarkerUnit: string,
  resultValue: number,
  biomarkerId?: string
): UnitCompatibilityResult {
  const normResult = normalizeUnit(resultUnit);
  const normBio = normalizeUnit(biomarkerUnit);

  if (!normResult || !normBio) {
    return {
      compatible: false,
      convertedValue: resultValue,
      errorReason: 'Unitate de măsură nespecificată sau invalidă.'
    };
  }

  // 1. Unități identice sau echivalente direct
  if (normResult === normBio) {
    return { compatible: true, convertedValue: resultValue };
  }

  const bioId = (biomarkerId || '').toLowerCase();

  // 2. Conversie masică universală g/L -> mg/dL (1 g = 1000 mg; 1 L = 10 dL => factor 100)
  if (normResult === 'g/l' && normBio === 'mg/dl') {
    const converted = Math.round(resultValue * 100 * 100) / 100;
    return {
      compatible: true,
      convertedValue: converted,
      conversionNote: `Conversie dimensională masică g/L în mg/dL (factor 100): ${converted} mg/dL`
    };
  }

  // 3. Conversie masică inversă mg/dL -> g/L
  if (normResult === 'mg/dl' && normBio === 'g/l') {
    const converted = Math.round((resultValue / 100) * 1000) / 1000;
    return {
      compatible: true,
      convertedValue: converted,
      conversionNote: `Conversie dimensională masică mg/dL în g/L (factor 0.01): ${converted} g/L`
    };
  }

  // 4. Trigliceride: mmol/L -> mg/dL (greutate moleculară medie a trigliceridelor ca trioleină ~ 885.7 g/mol => factor 88.57)
  if ((bioId === 'triglycerides' || bioId === 'tg') && normResult === 'mmol/l' && normBio === 'mg/dl') {
    const converted = Math.round(resultValue * 88.57 * 10) / 10;
    return {
      compatible: true,
      convertedValue: converted,
      conversionNote: `Conversie Trigliceride mmol/L în mg/dL (factor 88.57): ${converted} mg/dL`
    };
  }

  // 5. Vitamina D (25-OH-D): nmol/L -> ng/mL (1 ng/mL = 2.496 nmol/L => ng/mL = nmol/L / 2.496)
  if ((bioId === 'vitamin_d' || bioId === '25-oh-d') && normResult === 'nmol/l' && normBio === 'ng/ml') {
    const converted = Math.round((resultValue / 2.496) * 10) / 10;
    return {
      compatible: true,
      convertedValue: converted,
      conversionNote: `Conversie Vitamina D nmol/L în ng/mL (factor 2.496): ${converted} ng/mL`
    };
  }

  // 6. hs-CRP: mg/dL -> mg/L (1 mg/dL = 10 mg/L)
  if ((bioId === 'hscrp' || bioId.includes('crp')) && normResult === 'mg/dl' && normBio === 'mg/l') {
    const converted = Math.round(resultValue * 10 * 10) / 10;
    return {
      compatible: true,
      convertedValue: converted,
      conversionNote: `Conversie hs-CRP mg/dL în mg/L (factor 10): ${converted} mg/L`
    };
  }

  // 7. Unități complet incompatibile dimensional (ex: '%' vs 'mg/dL', 'kg' vs 'mg/dL')
  return {
    compatible: false,
    convertedValue: resultValue,
    errorReason: `Unitatea '${resultUnit}' nu este compatibilă dimensional cu unitatea biomarkerului '${biomarkerUnit}'. Comparația numerică este blocată pentru siguranță clinică.`
  };
}

/**
 * Verifică dacă notificările sunt activate pentru biomarkerul respectiv în preferințele utilizatorului.
 */
export function isBiomarkerAlertEnabled(
  biomarkerId: string,
  biomarker?: BiomarkerDefinition,
  userProfile?: UserProfile
): boolean {
  const pref = userProfile?.biomarkerAlertPreferences?.[biomarkerId];
  if (pref !== undefined) {
    return pref.enabled;
  }
  if (biomarker?.alertsEnabled !== undefined) {
    return biomarker.alertsEnabled;
  }
  return true;
}

export interface EvaluateLabResultParams {
  result: {
    id: string;
    biomarkerId: string;
    testDate: string;
    value: number;
    unit: string;
    referenceInterval?: string;
    laboratory?: string;
    notes?: string;
    documentId?: string;
    acknowledged?: boolean;
  };
  biomarker: BiomarkerDefinition;
  userProfile?: UserProfile;
}

/**
 * Evaluează un rezultat de laborator și generează clasificarea clinică și starea alertelor.
 *
 * CRITICAL SEPARATION RULE:
 * Evaluarea clinică (severity, isCritical, title, message, clinicalGuidance) este calculată
 * ÎNTOTDEAUNA independent de preferința notificationEnabled a utilizatorului.
 */
export function evaluateLabResultAlert(params: EvaluateLabResultParams): LabResultAlert {
  const { result, biomarker, userProfile } = params;
  const alertId = `alert_${result.id}`;
  const nowIso = new Date().toISOString();

  // 1. Preferința utilizatorului pentru notificări
  const notificationEnabled = isBiomarkerAlertEnabled(biomarker.id, biomarker, userProfile);

  // 2. Verificare compatibilitate unitate de măsură
  const unitCheck = checkUnitCompatibility(result.unit, biomarker.unit, result.value, biomarker.id);
  if (!unitCheck.compatible) {
    const clinicalAssessment: ClinicalAssessment = {
      severity: 'unitate_incompatibila',
      direction: 'unknown',
      isCritical: false,
      title: 'Unitate de măsură incompatibilă',
      message: unitCheck.errorReason || `Unitatea ${result.unit} este incompatibilă cu ${biomarker.unit}.`,
      clinicalGuidance: 'Verifică buletinul original de analiză și corectează unitatea pentru a permite evaluarea numerică.',
      referenceUsed: `Unitate așteptată: ${biomarker.unit}`,
      clinicalContext: 'reevaluare_confirmare',
      interpretationLimitations: 'Comparația numerică a fost blocată pentru a preveni interpretări eronate.'
    };

    return {
      id: alertId,
      resultId: result.id,
      biomarkerId: biomarker.id,
      biomarkerCode: biomarker.code,
      biomarkerName: biomarker.name,
      testDate: result.testDate,
      value: result.value,
      unit: result.unit,
      direction: 'unknown',
      severity: 'unitate_incompatibila',
      title: clinicalAssessment.title,
      message: clinicalAssessment.message,
      clinicalGuidance: clinicalAssessment.clinicalGuidance,
      referenceUsed: clinicalAssessment.referenceUsed,
      isCritical: false,
      acknowledged: false,
      createdAt: nowIso,
      clinicalAssessment,
      notificationEnabled,
      notificationVisible: notificationEnabled
    };
  }

  const effectiveValue = unitCheck.convertedValue;

  // 3. Parsare interval buletin laborator vs interval clinic fallback din protocol
  const parsedLabInterval = parseReferenceIntervalString(result.referenceInterval);
  const hasLabInterval = parsedLabInterval.parsed;

  // Intervalul clinic aplicabil: prioritar laboratorul, fallback intervalul clinic din protocol
  const applicableClinicalInterval: ParsedInterval = hasLabInterval
    ? parsedLabInterval
    : {
        min: biomarker.clinicalRefMin,
        max: biomarker.clinicalRefMax,
        minInclusive: true,
        maxInclusive: true,
        parsed: biomarker.clinicalRefMin !== undefined || biomarker.clinicalRefMax !== undefined,
        raw: `${biomarker.clinicalRefMin ?? 0}–${biomarker.clinicalRefMax ?? '—'} ${biomarker.unit}`
      };

  // Ținta personală optimă Longevity 3.2
  const optimalInterval: ParsedInterval = {
    min: biomarker.optimalMin,
    max: biomarker.optimalMax,
    minInclusive: true,
    maxInclusive: true,
    parsed: biomarker.optimalMin !== undefined || biomarker.optimalMax !== undefined,
    raw: `Optim: ${biomarker.optimalMin ?? 0}–${biomarker.optimalMax ?? '—'} ${biomarker.unit}`
  };

  // Verificare dacă lipsesc toate intervalele (nici laborator, nici clinic, nici optim)
  if (!applicableClinicalInterval.parsed && !optimalInterval.parsed) {
    const clinicalAssessment: ClinicalAssessment = {
      severity: 'interval_lipsa',
      direction: 'unknown',
      isCritical: false,
      title: 'Interval de referință lipsă',
      message: `Nu a fost specificat un interval de referință pentru ${result.laboratory || 'laborator'} și nu există un interval clinic fallback.`,
      clinicalGuidance: 'Introdu intervalul de referință din buletin pentru a activa evaluarea automată.',
      referenceUsed: 'Nespecificat',
      clinicalContext: 'reevaluare_confirmare'
    };

    return {
      id: alertId,
      resultId: result.id,
      biomarkerId: biomarker.id,
      biomarkerCode: biomarker.code,
      biomarkerName: biomarker.name,
      testDate: result.testDate,
      value: result.value,
      unit: result.unit,
      direction: 'unknown',
      severity: 'interval_lipsa',
      title: clinicalAssessment.title,
      message: clinicalAssessment.message,
      clinicalGuidance: clinicalAssessment.clinicalGuidance,
      referenceUsed: clinicalAssessment.referenceUsed,
      isCritical: false,
      acknowledged: false,
      createdAt: nowIso,
      clinicalAssessment,
      notificationEnabled,
      notificationVisible: notificationEnabled
    };
  }

  // Comparație cu intervalul clinic
  const clinicalComp = compareValueToInterval(effectiveValue, applicableClinicalInterval);
  // Comparație cu intervalul optim
  const optimalComp = compareValueToInterval(effectiveValue, optimalInterval);

  // Eticheta de referință utilizată
  const referenceUsedLabel = hasLabInterval
    ? `${result.laboratory || 'Laborator'}: ${result.referenceInterval}`
    : `Interval clinic fallback: ${biomarker.clinicalRefMin ?? '—'}–${biomarker.clinicalRefMax ?? '—'} ${biomarker.unit}`;

  // 4. EVALUARE CLINICĂ PROPORȚIONALĂ ȘI RIGUROASĂ (Cerința 5)
  let severity: LabAlertSeverity = 'normal';
  let direction: LabAlertDirection = 'in_range';
  let isCritical = false;
  let title = 'În interval optim de longevitate';
  let message = `Valoarea de ${effectiveValue} ${biomarker.unit} este în intervalul optim.`;
  let clinicalGuidance: string | undefined = undefined;
  let evidenceSource: string | undefined = undefined;
  let clinicalContext: ClinicalAssessment['clinicalContext'] = 'monitorizare_de_rutina';
  let interpretationLimitations: string | undefined = undefined;

  const bioId = biomarker.id.toLowerCase();

  // A. TRIGLICERIDE (TG)
  if (bioId === 'triglycerides' || biomarker.code.toUpperCase() === 'TG') {
    if (effectiveValue >= 500) {
      // Prag critic cu risc clinic major validat: Hipertrigliceridemie severă & risc de pancreatită acută
      severity = 'valoare_critica';
      direction = 'high';
      isCritical = true;
      clinicalContext = 'urgenta_imediata';
      evidenceSource = 'AHA Scientific Statement (Circulation 2019; 139:e1082) & Endocrine Society (J Clin Endocrinol Metab 2012; 97:2969)';
      title = '🚨 Valoare Critică: Risc Acut de Pancreatită (TG ≥ 500 mg/dL)';
      message = `Nivelul trigliceridelor (${effectiveValue} ${biomarker.unit}) este sever crescut (≥ 500 mg/dL), constituind un indicator de risc clinic major.`;
      clinicalGuidance = 'Diferențiere clinică necesară: în prezența simptomelor acute (dureri abdominale intense, greață, vărsături), prezentați-vă de urgență la camera de gardă; în absența simptomelor, este necesară evaluare medicală promptă pentru tratament hipolipemiant și confirmare à jeun. Nu modificați protocolul pe cont propriu.';
      interpretationLimitations = 'Trigliceridele sunt influențate de mese recente bogate în grăsimi sau consum de alcool. În absența durerii abdominale acute, medicul solicită de regulă reevaluare după un post strict de 12–14 ore.';
    } else if (clinicalComp.isAbove) {
      severity = 'evaluare_medicala';
      direction = 'high';
      clinicalContext = 'evaluare_medicala_prompta';
      evidenceSource = 'AHA / NLA Guidelines on Triglyceride Management (2019)';
      title = '⚠️ Evaluare Medicală: Hipertrigliceridemie peste intervalul laboratorului';
      message = `Trigliceridele (${effectiveValue} ${biomarker.unit}) depășesc limita superioară (${applicableClinicalInterval.raw || '150 mg/dL'}).`;
      clinicalGuidance = 'Consultă medicul curant. Verifică aportul de carbohidrați rafinați și stilul de viață.';
      interpretationLimitations = 'O măsurare unică necesită confirmare à jeun.';
    } else if (clinicalComp.isBelow) {
      severity = 'evaluare_medicala';
      direction = 'low';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: Trigliceride sub limita clinică';
      message = `Trigliceridele (${effectiveValue} ${biomarker.unit}) sunt sub limita inferioară clinică.`;
      clinicalGuidance = 'Discută cu medicul pentru a exclude cauze de malabsorbție sau malnutriție.';
    } else if (optimalComp.isAbove) {
      severity = 'abatere_usoara';
      direction = 'high';
      clinicalContext = 'monitorizare_de_rutina';
      title = 'ℹ️ Abatere Ușoară față de Ținta Optimă de Longevitate';
      message = `Valoarea (${effectiveValue} ${biomarker.unit}) este în intervalul clinic normal al laboratorului, dar depășește ținta optimă a protocolului (< ${biomarker.optimalMax ?? 80} ${biomarker.unit}).`;
      clinicalGuidance = 'Menține alimentația controlată, fastingul 16:8 și antrenamentele Zone 2 conform Protocolului 3.2.';
    }
  }

  // B. HbA1c (Hemoglobina Glicată) — REVIZUIT CLINIC
  // HbA1c reflectă media pe 90-120 zile; NU este test de urgență acută pentru cetoacidoză (aceea se măsoară prin glicemie/cetone).
  // Chiar la > 10%, clasificarea corectă este evaluare_medicala promptă, nu valoare_critica de panică.
  else if (bioId === 'hba1c') {
    evidenceSource = 'American Diabetes Association (ADA) Standards of Care in Diabetes (2024 / 2026)';
    if (effectiveValue > 10.0 || effectiveValue < 3.5) {
      severity = 'evaluare_medicala';
      direction = effectiveValue > 10.0 ? 'high' : 'low';
      isCritical = false; // Revizuit: nu este urgență imediată vitală izolată
      clinicalContext = 'evaluare_medicala_prompta';
      title = effectiveValue > 10.0
        ? '⚠️ Evaluare Medicală Promptă: Control Glicemic Sever Deficitar (HbA1c > 10%)'
        : '⚠️ Evaluare Medicală Promptă: HbA1c Extrem de Scăzută (< 3.5%)';
      message = effectiveValue > 10.0
        ? `HbA1c (${effectiveValue} %) indică un control glicemic cronic sever deficitar pe ultimele 3 luni.`
        : `HbA1c (${effectiveValue} %) este extrem de scăzută, sugerând posibile anomalii eritrocitare sau hemoliză.`;
      clinicalGuidance = 'Consultă prompt un medic diabetolog/endocrinolog. În caz de simptome acute, se determină glicemia capilară imediată.';
      interpretationLimitations = 'HbA1c este o medie pe 90–120 de zile. Valori aberante scăzute pot fi cauzate de hemoglobinopatii, anemii hemolitice sau pierderi de sânge, nu hipoglicemie acută.';
    } else if (effectiveValue >= 6.5) {
      severity = 'evaluare_medicala';
      direction = 'high';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: Valoare în Criteriul ADA de Diabet (≥ 6.5%)';
      message = `HbA1c (${effectiveValue} %) atinge pragul de diagnostic ADA pentru diabet zaharat.`;
      clinicalGuidance = 'Ghidul ADA recomandă consult de specialitate pentru confirmare și management glicemic.';
    } else if (effectiveValue >= 5.7) {
      severity = 'evaluare_medicala';
      direction = 'high';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: Categorie de Prediabet ADA (5.7–6.4%)';
      message = `HbA1c (${effectiveValue} %) este în intervalul de risc crescut de diabet (prediabet).`;
      clinicalGuidance = 'Consultă medicul curant pentru măsuri de dietoterapie și prevenție metabolică.';
    } else if (clinicalComp.isBelow) {
      severity = 'evaluare_medicala';
      direction = 'low';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: HbA1c sub limita inferioară a laboratorului';
      message = `HbA1c (${effectiveValue} %) este sub intervalul de referință.`;
      clinicalGuidance = 'Discută cu medicul pentru a verifica durata de viață a hematiilor.';
    } else if (optimalComp.isAbove) {
      severity = 'abatere_usoara';
      direction = 'high';
      clinicalContext = 'monitorizare_de_rutina';
      title = 'ℹ️ Abatere Ușoară față de Optimul de Longevitate';
      message = `Valoarea de ${effectiveValue} % depășește ținta ideală (≤ ${biomarker.optimalMax ?? 5.3} %), deși rămâne normoglicemică clinic (< 5.7%).`;
      clinicalGuidance = 'Optimizează ferestrele alimentare și aportul de fibre solubile.';
    }
  }

  // C. hs-CRP (Proteina C-reactivă înalt sensibilă) — REVIZUIT CLINIC
  // CDC/AHA stipulează explicit că valori > 10 mg/L reflectă un proces inflamator/infecțios acut ce necesită repetare la 2-3 săptămâni.
  // NU este valoare_critica de panică!
  else if (bioId === 'hscrp' || biomarker.code.toLowerCase().includes('crp')) {
    evidenceSource = 'CDC / American Heart Association Scientific Statement (Circulation 2003; 107:499–511)';
    if (effectiveValue > 10.0) {
      severity = 'evaluare_medicala';
      direction = 'high';
      isCritical = false; // Revizuit proporțional: fără panică nejustificată
      clinicalContext = 'reevaluare_confirmare';
      title = '⚠️ Evaluare Medicală: Inflamație Acută / Reacție de Fază Acută (hs-CRP > 10 mg/L)';
      message = `hs-CRP (${effectiveValue} ${biomarker.unit}) este semnificativ crescut, sugerând un proces inflamator sau infecțios acut intercurent.`;
      clinicalGuidance = 'Ghidul CDC/AHA recomandă consult medical și repetarea analizei după 2–3 săptămâni de la remiterea oricărui episod infecțios.';
      interpretationLimitations = 'La valori > 10 mg/L, hs-CRP nu mai măsoară riscul cardiovascular cronic aterogen, ci reflectă o reacție inflamatorie acută nespecifică.';
    } else if (clinicalComp.isAbove) {
      severity = 'evaluare_medicala';
      direction = 'high';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: hs-CRP peste intervalul laboratorului';
      message = `hs-CRP (${effectiveValue} ${biomarker.unit}) depășește limita clinică standard (${applicableClinicalInterval.raw || '3.0 mg/L'}).`;
      clinicalGuidance = 'Discută cu medicul pentru investigarea factorilor pro-inflamatori.';
    } else if (optimalComp.isAbove) {
      severity = 'abatere_usoara';
      direction = 'high';
      clinicalContext = 'monitorizare_de_rutina';
      title = 'ℹ️ Abatere Ușoară: Inflamație Vasculară Peste Ținta Optimă';
      message = `hs-CRP (${effectiveValue} ${biomarker.unit}) este peste ținta de longevitate (≤ ${biomarker.optimalMax ?? 0.5} ${biomarker.unit}), dar în intervalul clinic acceptat.`;
      clinicalGuidance = 'Optimizarea somnului, a acizilor grași Omega-3 și a sănătății parodontale.';
    }
  }

  // D. VITAMINA D (25-OH-D) — REVIZUIT CLINIC
  // Deficiența severă (< 10) sau nivelurile > 150 sunt afecțiuni cronice / iatrogene, nu stop cardiac acut.
  // Toxicitatea depinde de calciul seric. Clasificare proporțională: evaluare_medicala promptă.
  else if (bioId === 'vitamin_d' || biomarker.code.includes('25-OH')) {
    evidenceSource = 'Endocrine Society Clinical Practice Guidelines (J Clin Endocrinol Metab 2011; 96:1911–1930)';
    if (effectiveValue < 10.0 || effectiveValue > 150.0) {
      severity = 'evaluare_medicala';
      direction = effectiveValue < 10.0 ? 'low' : 'high';
      isCritical = false; // Revizuit proporțional
      clinicalContext = 'evaluare_medicala_prompta';
      title = effectiveValue < 10.0
        ? '⚠️ Evaluare Medicală Promptă: Deficiență Severă de Vitamina D (< 10 ng/mL)'
        : '⚠️ Evaluare Medicală Promptă: Nivel cu Risc de Hipervitaminoză / Toxicitate (> 150 ng/mL)';
      message = effectiveValue < 10.0
        ? `Nivelul de 25-OH-D (${effectiveValue} ${biomarker.unit}) indică o deficiență severă cu risc crescut de osteomalacie pe termen lung.`
        : `Nivelul de 25-OH-D (${effectiveValue} ${biomarker.unit}) depășește pragul de siguranță al societăților de endocrinologie.`;
      clinicalGuidance = effectiveValue > 150.0
        ? 'Consultă medicul specialist. Se recomandă întreruperea temporară a suplimentării și dozarea calciului seric.'
        : 'Consultă medicul curant pentru o schemă terapeutică adecvată de corectare a deficitului.';
      interpretationLimitations = 'Toxicitatea clinică a vitaminei D este mediată de hipercalcemie, nu de titrul izolat de 25-OH-D.';
    } else if (clinicalComp.isBelow || clinicalComp.isAbove) {
      severity = 'evaluare_medicala';
      direction = clinicalComp.isBelow ? 'low' : 'high';
      clinicalContext = 'evaluare_medicala_prompta';
      title = clinicalComp.isBelow
        ? '⚠️ Evaluare Medicală: Nivel de Vitamina D sub intervalul clinic'
        : '⚠️ Evaluare Medicală: Nivel de Vitamina D peste intervalul clinic standard';
      message = `Vitamina D (${effectiveValue} ${biomarker.unit}) este în afara limitelor de laborator (${applicableClinicalInterval.raw || '30–100 ng/mL'}).`;
      clinicalGuidance = 'Consultă medicul pentru adaptarea dozei de menținere.';
    } else if (optimalComp.isBelow || optimalComp.isAbove) {
      severity = 'abatere_usoara';
      direction = optimalComp.isBelow ? 'low' : 'high';
      clinicalContext = 'monitorizare_de_rutina';
      title = 'ℹ️ Abatere Ușoară față de Ținta Optimă de Longevitate';
      message = `Valoarea (${effectiveValue} ${biomarker.unit}) este în siguranță clinică, dar în afara intervalului ideal (${biomarker.optimalMin ?? 50}–${biomarker.optimalMax ?? 70} ${biomarker.unit}).`;
      clinicalGuidance = 'Menține expunerea controlată și schema actuală agreată.';
    }
  }

  // E. HOMOCISTEINĂ (HCY) — REVIZUIT CLINIC
  // Factor de risc cronic aterotrombotic, nu urgență acută. Clasificare: evaluare_medicala promptă.
  else if (bioId === 'homocysteine' || biomarker.code.toUpperCase() === 'HCY') {
    evidenceSource = 'Kang SS et al. (Circulation 1992); Refsum H et al. (Clin Chem 2004; 50:3–32)';
    if (effectiveValue > 30.0) {
      severity = 'evaluare_medicala';
      direction = 'high';
      isCritical = false; // Revizuit proporțional
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală Promptă: Hiperhomocisteinemie Severă (> 30 µmol/L)';
      message = `Homocisteina (${effectiveValue} ${biomarker.unit}) este la un nivel sever crescut.`;
      clinicalGuidance = 'Consultă medicul pentru investigarea metabolismului metilării și a nivelurilor de B12/folat/B6.';
      interpretationLimitations = 'Homocisteina este un marker cronic; valorile izolate crescute impun investigații și optimizare dietetică, nu manevre de resuscitare.';
    } else if (clinicalComp.isAbove || clinicalComp.isBelow) {
      severity = 'evaluare_medicala';
      direction = clinicalComp.isAbove ? 'high' : 'low';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: Homocisteină în afara limitelor clinice';
      message = `Valoarea (${effectiveValue} ${biomarker.unit}) depășește limita clinică standard (${applicableClinicalInterval.raw || '15 µmol/L'}).`;
      clinicalGuidance = 'Recomandată evaluarea aportului de vitamine B cu medicul curant.';
    } else if (optimalComp.isAbove) {
      severity = 'abatere_usoara';
      direction = 'high';
      clinicalContext = 'monitorizare_de_rutina';
      title = 'ℹ️ Abatere Ușoară față de Optimul de Longevitate';
      message = `Valoarea (${effectiveValue} ${biomarker.unit}) este peste ținta optimă (< ${biomarker.optimalMax ?? 9.0} ${biomarker.unit}), dar în intervalul clinic normal.`;
      clinicalGuidance = 'Asigură aport optim de colină și cofactori ai metilării.';
    }
  }

  // F. ApoB (Apolipoproteina B)
  // Nu există prag de panică validat în ESC/EAS. Evaluare proporțională:
  else if (bioId === 'apob') {
    evidenceSource = 'ESC / EAS Guidelines for the management of dyslipidaemias (Eur Heart J 2019; 41:111–188)';
    if (clinicalComp.isAbove) {
      severity = 'evaluare_medicala';
      direction = 'high';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: Risc Cardiovascular Aterogen Crescut (ApoB peste limita clinică)';
      message = `ApoB (${effectiveValue} ${biomarker.unit}) depășește limita de referință a laboratorului (${applicableClinicalInterval.raw || '< 100 mg/dL'}).`;
      clinicalGuidance = 'Ghidurile ESC/EAS recomandă consult cardiologic pentru evaluarea riscului cardiovascular global.';
    } else if (clinicalComp.isBelow) {
      severity = 'evaluare_medicala';
      direction = 'low';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: ApoB sub limita clinică inferioară';
      message = `ApoB (${effectiveValue} ${biomarker.unit}) este sub limita inferioară clinică (${applicableClinicalInterval.raw || '40 mg/dL'}).`;
      clinicalGuidance = 'Discută cu medicul despre posibile cauze de hipolipidemie marcată.';
    } else if (optimalComp.isAbove) {
      severity = 'abatere_usoara';
      direction = 'high';
      clinicalContext = 'monitorizare_de_rutina';
      title = 'ℹ️ Abatere Ușoară: ApoB peste Ținta de Longevitate';
      message = `Valoarea de ${effectiveValue} ${biomarker.unit} depășește ținta optimă a protocolului (≤ ${biomarker.optimalMax ?? 65} ${biomarker.unit}), dar este în intervalul normal al laboratorului.`;
      clinicalGuidance = 'Menține dieta mediteraneană, optimizarea grăsimilor saturate și antrenamentele regulate.';
    }
  }

  // G. LIPOPROTEINA (a) - Lp(a)
  else if (bioId === 'lpa') {
    evidenceSource = 'ESC / EAS Guidelines (2019) & National Lipid Association Scientific Statement (2019)';
    if (clinicalComp.isAbove) {
      severity = 'evaluare_medicala';
      direction = 'high';
      clinicalContext = 'evaluare_medicala_prompta';
      title = '⚠️ Evaluare Medicală: Lp(a) Crescută peste intervalul clinic';
      message = `Lipoproteina (a) (${effectiveValue} ${biomarker.unit}) este un factor de risc cardiovascular independent, determinat genetic.`;
      clinicalGuidance = 'Consultă un medic cardiolog pentru evaluarea riscului cardiovascular cumulat.';
    } else if (optimalComp.isAbove) {
      severity = 'abatere_usoara';
      direction = 'high';
      clinicalContext = 'monitorizare_de_rutina';
      title = 'ℹ️ Abatere Ușoară: Lp(a) Peste Ținta Optimă';
      message = `Valoarea (${effectiveValue} ${biomarker.unit}) depășește ținta ideală (< ${biomarker.optimalMax ?? 30} ${biomarker.unit}), dar este în intervalul clinic acceptat.`;
      clinicalGuidance = 'Nivelul Lp(a) este stabil genetic; se recomandă controlul riguros al celorlalți factori aterogeni (ApoB, TA).';
    }
  }

  // H. INSULINĂ À JEUN
  else if (bioId === 'fasting_insulin' || bioId === 'insulina') {
    if (clinicalComp.isAbove || clinicalComp.isBelow) {
      severity = 'evaluare_medicala';
      direction = clinicalComp.isAbove ? 'high' : 'low';
      clinicalContext = 'evaluare_medicala_prompta';
      title = clinicalComp.isAbove
        ? '⚠️ Evaluare Medicală: Hiperinsulinemie Clinică'
        : '⚠️ Evaluare Medicală: Insulină à jeun sub limita minimă';
      message = `Insulina à jeun (${effectiveValue} ${biomarker.unit}) este în afara limitelor laboratorului (${applicableClinicalInterval.raw || '2.6–24.9 µIU/mL'}).`;
      clinicalGuidance = 'Consultă medicul endocrinolog/diabetolog pentru evaluarea rezistenței la insulină.';
    } else if (optimalComp.isAbove) {
      severity = 'abatere_usoara';
      direction = 'high';
      clinicalContext = 'monitorizare_de_rutina';
      title = 'ℹ️ Abatere Ușoară: Insulină Peste Ținta Optimă';
      message = `Valoarea de ${effectiveValue} ${biomarker.unit} depășește optimul de longevitate (≤ ${biomarker.optimalMax ?? 5.0} ${biomarker.unit}), deși rămâne în intervalul clinic normal.`;
      clinicalGuidance = 'Respectă postul intermitent 16:8 și antrenamentele Zone 2/forță.';
    }
  }

  // I. EVALUARE GENERALĂ PENTRU ORICE ALT BIOMARKER (FĂRĂ PRAGURI INVENTATE)
  else {
    if (clinicalComp.isAbove || clinicalComp.isBelow) {
      severity = 'evaluare_medicala';
      direction = clinicalComp.isAbove ? 'high' : 'low';
      clinicalContext = 'evaluare_medicala_prompta';
      title = clinicalComp.isAbove
        ? `⚠️ Evaluare Medicală: ${biomarker.name} peste intervalul laboratorului`
        : `⚠️ Evaluare Medicală: ${biomarker.name} sub intervalul laboratorului`;
      message = `Rezultatul (${effectiveValue} ${biomarker.unit}) este în afara limitelor clinice (${applicableClinicalInterval.raw || 'Nespecificat'}).`;
      clinicalGuidance = 'Discută rezultatul cu medicul curant la următoarea consultație.';
    } else if (optimalComp.isAbove || optimalComp.isBelow) {
      severity = 'abatere_usoara';
      direction = optimalComp.isAbove ? 'high' : 'low';
      clinicalContext = 'monitorizare_de_rutina';
      title = `ℹ️ Abatere Ușoară: ${biomarker.code} în afara țintei optime`;
      message = `Valoarea (${effectiveValue} ${biomarker.unit}) este în intervalul clinic uzual, dar în afara țintei de longevitate (${optimalInterval.raw || 'Nespecificat'}).`;
      clinicalGuidance = 'Continuă monitorizarea periodică conform protocolului.';
    }
  }

  // Structura de evaluare clinică pură
  const clinicalAssessment: ClinicalAssessment = {
    severity,
    direction,
    isCritical,
    title,
    message,
    clinicalGuidance,
    referenceUsed: referenceUsedLabel,
    evidenceSource,
    clinicalContext,
    interpretationLimitations
  };

  // Notificarea este vizibilă doar dacă utilizatorul a activat alertele pentru acest biomarker
  // EXCEPȚIE DE SIGURANȚĂ: o valoare critică veritabilă (ex: TG ≥ 500 mg/dL) menține indicatorul de siguranță vizibil
  const notificationVisible = (notificationEnabled || isCritical) && severity !== 'normal' && !result.acknowledged;

  return {
    id: alertId,
    resultId: result.id,
    biomarkerId: biomarker.id,
    biomarkerCode: biomarker.code,
    biomarkerName: biomarker.name,
    testDate: result.testDate,
    value: result.value,
    unit: result.unit,
    direction,
    severity,
    title,
    message,
    clinicalGuidance,
    referenceUsed: referenceUsedLabel,
    isCritical,
    acknowledged: !!result.acknowledged,
    createdAt: nowIso,
    clinicalAssessment,
    notificationEnabled,
    notificationVisible
  };
}

/**
 * Filtrează alertele active care necesită afișare pentru utilizator.
 * Notificările dezactivate de utilizator sunt excluse din notificările active,
 * cu excepția valorilor critice de siguranță vitală.
 */
export function getActiveAlerts(results: LabResult[]): LabResultAlert[] {
  const activeAlerts: LabResultAlert[] = [];
  const seenResultIds = new Set<string>();

  const sorted = [...results].sort((a, b) => b.testDate.localeCompare(a.testDate));

  for (const r of sorted) {
    if (!r.alert || seenResultIds.has(r.id)) continue;
    seenResultIds.add(r.id);

    const isVisible = r.alert.notificationVisible !== undefined
      ? r.alert.notificationVisible
      : (r.alert.notificationEnabled !== false && !r.alert.acknowledged && r.alert.severity !== 'normal');

    if (isVisible && r.alert.severity !== 'normal') {
      activeAlerts.push(r.alert);
    }
  }

  return activeAlerts;
}
