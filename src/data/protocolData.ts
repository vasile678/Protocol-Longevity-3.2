import {
  SupplementDefinition,
  FoodItem,
  BiomarkerDefinition,
  UserProfile,
  ExperimentalIntervention
} from '../types/protocol';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'primary_user',
  name: 'Utilizator Longevity',
  weightKg: 78, // Greutate corporală configurabilă
  targetProteinGPerKg: 1.8, // Mediana țintei 1.6 - 2.2 g/kg/zi din protocol
  targetFibreG: 30, // Țintă minimă protocol: ≥30 g/zi
  fastingTargetHours: 16, // Protocol: 16:8
  labCadenceMonths: 6, // Protocol: Analize la 6 luni
  citicolineWeekdaySchedule: 'LMV', // Secțiunea 5 indică L/M/V, Secțiunea 10 indică L/M/J
  tier3CyclingScope: 'all_tier3', // Secțiunea 10 menționează ciclare Tier 3 (8 săpt ON / 2 săpt OFF)
  tier3CycleStartDate: '2026-09-01', // Data de pornire a ciclului curent
  tier3WeeksOn: 8,
  tier3WeeksOff: 2,
  healthGoals: [
    'Maximizarea healthspan-ului și menținerea masei musculare funcționale',
    'Sănătate metabolică, control glicemic (HbA1c < 5.3%) și ApoB < 65 mg/dL',
    'Eficiență cardiovasculară Zone 2 & capacitate VO₂max optimă',
    'Arhitectură de somn profund (NREM) și stabilitate circadiană'
  ],
  dietaryPreferences: [
    'Fasting 16:8 (2 mese/zi în zilele normale)',
    'OMAD opțional de 2×/săptămână când permite aportul proteic',
    'Alimente integrale fără zahăr procesat',
    'Psyllium 5 g/zi + legume fermentate în saramură'
  ],
  fitnessTargets: {
    weeklyStrengthSessions: 3,
    weeklyZone2Minutes: 120,
    weeklyVo2MaxSessions: 1,
    weeklyMobilitySessions: 3
  },
  approvedProtocolAdjustments: [
    {
      id: 'adj_1',
      date: '2026-09-01',
      title: 'Validare programare Citicolină L/M/V',
      description: 'Adoptare orar Luni/Miercuri/Vineri conform Secțiunii 5 din protocol',
      status: 'approved'
    }
  ],
  dataRetentionDays: 0, // Nelimitat
  aiConsentGranted: false,
  updatedAt: new Date().toISOString()
};

export const DEFAULT_PROTOCOL_VERSION = {
  version: '3.2.0',
  name: 'Protocol Longevity 3.2 — Governed Edition',
  activeDate: '2026-09-01',
  description: 'Stabilitate > stimulare · Healthspan > biohacking · Minimum effective dose · Fitness > suplimente.',
  updatedAt: new Date().toISOString()
};

/**
 * Registrul oficial al suplimentelor din Protocolul Longevity 3.2
 * Zile programate: 0 = Dum, 1 = Lun, 2 = Mar, 3 = Mie, 4 = Joi, 5 = Vin, 6 = Sam
 */
export const PROTOCOL_SUPPLEMENTS: SupplementDefinition[] = [
  // --- DIMINEAȚA ---
  {
    id: 'creatine',
    name: 'Creatină monohidrat',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'dimineata',
    doseDescription: '5 g / zi',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Zilnic
    activeIngredients: 'Creatine monohydrate 5g',
    isCycling: false,
    governanceNote: 'Tier 2 Support: suport cellular ATP, forță musculară și neuroprotecție.'
  },
  {
    id: 'taurine_morning',
    name: 'Taurină (Dimineața)',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'dimineata',
    doseDescription: '1500 mg',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Zilnic
    activeIngredients: 'Taurine 1500mg',
    isCycling: false,
    governanceNote: 'Tier 2 Support: longevitate celulară, funcție mitocondrială și protecție cardiovasculară.'
  },
  {
    id: 'omega3',
    name: 'Omega-3 (Trigliceride concentrate)',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'dimineata',
    doseDescription: '1 capsulă (500 mg EPA, 250 mg DHA)',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Zilnic
    activeIngredients: 'EPA 500mg, DHA 250mg',
    isCycling: false,
    governanceNote: 'Tier 2 Support: indice omega-3, rezoluție inflamatorie și integritate membranară.'
  },
  {
    id: 'magnesium_bisglycinate',
    name: 'Magneziu bisglicinat',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'dimineata',
    doseDescription: '1 capsulă',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Zilnic
    activeIngredients: 'Magnesium bisglycinate (elemental ~100-150mg)',
    isCycling: false,
    governanceNote: 'Tier 2 Support: cofactor enzimatic >300 căi metabolice, biodisponibilitate digestivă optimă.'
  },
  {
    id: 'vit_d3_k2',
    name: 'Vitamina D3 + K2',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'dimineata',
    doseDescription: 'D3 + K2 (MK-7)',
    scheduledDays: [1, 3, 5], // Luni, Miercuri, Vineri
    activeIngredients: 'Cholecalciferol D3 + Menaquinone-7 K2',
    isCycling: false,
    governanceNote: 'Tier 2 Support (L/M/V): optimizare nivel seric 25-OH D și carboxilare osteocalcină/MGP.'
  },
  {
    id: 'methyl_b_complex',
    name: 'Methyl B-Complex',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'dimineata',
    doseDescription: '1 capsulă forme metilate',
    scheduledDays: [1, 3, 5], // Luni, Miercuri, Vineri
    activeIngredients: 'Methylfolate (5-MTHF), Methylcobalamin B12, P-5-P B6',
    isCycling: false,
    governanceNote: 'Tier 2 Support (L/M/V): ciclul metilării și controlul homocisteinei.'
  },
  {
    id: 'shilajit',
    name: 'Shilajit purificat',
    tier: 'experimental',
    tierLabel: 'Tier 3 — Experimental',
    timing: 'dimineata',
    doseDescription: '400 mg la cafea',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Dimineața, ciclat conform Tier 3
    activeIngredients: 'Fulvic acid, trace minerals 400mg',
    isCycling: true,
    reviewWarning: 'Status experimental: se monitorizează toleranța și puritatea laboratorului (metale grele).',
    governanceNote: 'Tier 3 Experimental: bio-energie mitocondrială și optimizare testosteron/energie.',
    hasAmbiguity: true,
    ambiguityDetail: 'Protocolul listează Shilajit în secțiunea 2 dimineața și în secțiunea 10 în TIER 3 supus ciclării 8s ON / 2s OFF.'
  },
  {
    id: 'citicoline',
    name: 'Citicolină (CDP-Choline)',
    tier: 'experimental',
    tierLabel: 'Tier 3 — Experimental',
    timing: 'dimineata',
    doseDescription: '500 mg (1 capsulă)',
    scheduledDays: [1, 3, 5], // Implicit L/M/V (Sec 5), configurabil la L/M/J (Sec 10)
    activeIngredients: 'Citicoline 500mg',
    isCycling: true,
    governanceNote: 'Tier 3 Experimental: precursor acetilcolină și fosfatidilcolină pentru funcție cognitivă.',
    hasAmbiguity: true,
    ambiguityDetail: 'Discrepanță în textul sursă: Secțiunea 5 menționează 500 mg — L/M/V, iar Secțiunea 10 menționează L/M/J. Poate fi configurat din Setări.'
  },
  {
    id: 'methylene_blue',
    name: 'Methylene Blue (Albastru de Metilen)',
    tier: 'experimental',
    tierLabel: 'Tier 3 — Experimental',
    timing: 'dimineata',
    doseDescription: '5 picături, soluție 1%',
    scheduledDays: [2, 4], // Marți și Joi
    activeIngredients: 'USP Grade Methylene Blue 1% solution (~2.5mg)',
    isCycling: true,
    reviewWarning: 'Status strict experimental. Protocol de ciclare obligatoriu: 8 săptămâni ON → 2 săptămâni OFF. Nu se combină cu inhibitori MAO sau serotoninergice.',
    governanceNote: 'Tier 3 Experimental: donor/acceptor de electroni în lanțul respirator mitocondrial complex IV.',
    hasAmbiguity: true,
    ambiguityDetail: 'Nu este pilon fundamental al protocolului. Ciclare strictă 8 săptămâni ON urmate de 2 săptămâni pauză (OFF).'
  },

  // --- SEARA ---
  {
    id: 'taurine_evening',
    name: 'Taurină (Seara)',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'seara',
    doseDescription: '1500 mg (cu 1-2 ore înainte de somn)',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Zilnic
    activeIngredients: 'Taurine 1500mg',
    isCycling: false,
    governanceNote: 'Tier 2 Support: agonist GABA-ergic blând, scăderea temperaturii centrale și stabilitate autonomică nocturnă.'
  },
  {
    id: 'magnesium_threonate',
    name: 'Magneziu L-treonat',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'seara',
    doseDescription: '2 capsule (cu 1-2 ore înainte de somn)',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Zilnic
    activeIngredients: 'Magnesium L-threonate (Magtein)',
    isCycling: false,
    governanceNote: 'Tier 2 Support: penetranță hematoencefalică pentru calitatea arhitecturii somnului NREM.'
  },
  {
    id: 'glycine',
    name: 'Glicină',
    tier: 'support',
    tierLabel: 'Tier 2 — Support',
    timing: 'seara',
    doseDescription: '3 g (cu 1-2 ore înainte de somn)',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Zilnic
    activeIngredients: 'Glycine powder/caps 3000mg',
    isCycling: false,
    governanceNote: 'Tier 2 Support: termoreglare periferică, latența adormirii și precursor de glutation.'
  },
  {
    id: 'zinc',
    name: 'Zinc',
    tier: 'support',
    tierLabel: 'Tier 2 — Conditional Support',
    timing: 'seara',
    doseDescription: '25 mg (Marți / Joi seara)',
    scheduledDays: [2, 4], // Marți, Joi
    activeIngredients: 'Zinc bisglycinate / picolinate 25mg',
    isCycling: false,
    reviewWarning: 'Componentă condiționată de necesitate / status nutrițional, nu obligatorie zilnic.',
    governanceNote: 'Tier 2 Conditional Support (Ma/Jo): imunitate și sinteză proteică, dozaj moderat anti-adaptare cupru.'
  }
];

export const INITIAL_SUPPLEMENT_PRODUCTS = PROTOCOL_SUPPLEMENTS.map(s => ({
  id: `prod_${s.id}_initial`,
  supplementId: s.id,
  brandName: s.id === 'creatine' ? 'Creapure (Generic)'
    : s.id === 'omega3' ? 'Nordic Naturals'
    : s.id === 'magnesium_threonate' ? 'Magtein Life Extension'
    : s.id === 'citicoline' ? 'Cognizin Kyowa'
    : s.id === 'methylene_blue' ? 'USP Chemical Grade'
    : 'Brand Protocol 3.2',
  productName: s.name,
  form: s.doseDescription.includes('capsul') ? 'Capsule'
    : s.doseDescription.includes('picături') ? 'Picături'
    : 'Pulbere',
  servingSize: s.doseDescription,
  activeIngredients: s.activeIngredients,
  concentrationPerServing: s.doseDescription,
  labelNotes: s.governanceNote,
  effectiveStartDate: '2026-09-01',
  isArchived: false,
  createdAt: '2026-09-01T08:00:00Z'
}));

/**
 * Alimente de bază definite explicit în Secțiunea 3 (Nutriție)
 */
export const STAPLE_FOODS: FoodItem[] = [
  {
    id: 'castravete',
    name: 'Castravete proaspăt',
    category: 'legume',
    caloriesPer100g: 15,
    proteinPer100g: 0.7,
    carbsPer100g: 3.6,
    fatPer100g: 0.1,
    fibrePer100g: 0.5,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 aliment de bază'
  },
  {
    id: 'salata_verde',
    name: 'Salată verde / frunze verzi',
    category: 'legume',
    caloriesPer100g: 15,
    proteinPer100g: 1.4,
    carbsPer100g: 2.9,
    fatPer100g: 0.2,
    fibrePer100g: 1.3,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 aliment de bază'
  },
  {
    id: 'rosii',
    name: 'Roșii proaspete',
    category: 'legume',
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    fibrePer100g: 1.2,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 aliment de bază'
  },
  {
    id: 'legume_la_cuptor',
    name: 'Legume asortate la cuptor (dovlecei, ardei, broccoli)',
    category: 'legume',
    caloriesPer100g: 45,
    proteinPer100g: 2.1,
    carbsPer100g: 8.2,
    fatPer100g: 0.5,
    fibrePer100g: 3.4,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 aliment de bază'
  },
  {
    id: 'afine',
    name: 'Afine proaspete / congelate',
    category: 'fructe',
    caloriesPer100g: 57,
    proteinPer100g: 0.7,
    carbsPer100g: 14.5,
    fatPer100g: 0.3,
    fibrePer100g: 2.4,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 aliment de bază (polifenoli)'
  },
  {
    id: 'capsuni',
    name: 'Căpșuni proaspete',
    category: 'fructe',
    caloriesPer100g: 32,
    proteinPer100g: 0.7,
    carbsPer100g: 7.7,
    fatPer100g: 0.3,
    fibrePer100g: 2.0,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 aliment de bază (fisetină/vit C)'
  },
  {
    id: 'kiwi',
    name: 'Kiwi',
    category: 'fructe',
    caloriesPer100g: 61,
    proteinPer100g: 1.1,
    carbsPer100g: 14.7,
    fatPer100g: 0.5,
    fibrePer100g: 3.0,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 aliment de bază (digestie/vit C)'
  },
  {
    id: 'lamai',
    name: 'Lămâie / suc de lămâie',
    category: 'fructe',
    caloriesPer100g: 29,
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatPer100g: 0.3,
    fibrePer100g: 2.8,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 aliment de bază'
  },
  {
    id: 'muraturi_saramura',
    name: 'Murături tradiționale în saramură (fără oțet/zahăr)',
    category: 'fermentate_fibre',
    caloriesPer100g: 14,
    proteinPer100g: 0.6,
    carbsPer100g: 2.4,
    fatPer100g: 0.2,
    fibrePer100g: 1.6,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 probiotice naturale'
  },
  {
    id: 'evoo',
    name: 'EVOO (Ulei de măsline extravirgin presat la rece)',
    category: 'grasimi_sanatoase',
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
    fibrePer100g: 0,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 polifenoli și grăsimi MUFA'
  },
  {
    id: 'unt_ghee',
    name: 'Unt ecologic ≥82% / Ghee',
    category: 'grasimi_sanatoase',
    caloriesPer100g: 720,
    proteinPer100g: 0.8,
    carbsPer100g: 0.6,
    fatPer100g: 82,
    fibrePer100g: 0,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 butirat și vitamine liposolubile'
  },
  {
    id: 'chefir',
    name: 'Chefir tradițional fermentat',
    category: 'fermentate_fibre',
    caloriesPer100g: 65,
    proteinPer100g: 3.5,
    carbsPer100g: 4.8,
    fatPer100g: 3.5,
    fibrePer100g: 0,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 microbiom & proteină'
  },
  {
    id: 'psyllium',
    name: 'Psyllium tărâțe (5 g doză protocol = 3.9g fibre)',
    category: 'fermentate_fibre',
    caloriesPer100g: 189,
    proteinPer100g: 1.5,
    carbsPer100g: 1.7,
    fatPer100g: 0.5,
    fibrePer100g: 78.0,
    isStaple: true,
    isCustom: false,
    sourceNote: 'Protocol 3.2 recomandare zilnică 5g psyllium'
  },
  // Surse dense de proteină calitativă pentru atingerea țintei de 1.6-2.2 g/kg
  {
    id: 'oua_fierte',
    name: 'Ouă de țară / ecologice',
    category: 'proteine',
    caloriesPer100g: 145,
    proteinPer100g: 12.6,
    carbsPer100g: 0.8,
    fatPer100g: 10.0,
    fibrePer100g: 0,
    isStaple: false,
    isCustom: false,
    sourceNote: 'Profil complet aminoacizi + colină'
  },
  {
    id: 'piept_pui',
    name: 'Piept de pui gătit',
    category: 'proteine',
    caloriesPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    fibrePer100g: 0,
    isStaple: false,
    isCustom: false,
    sourceNote: 'Sursă densă de proteină slabă'
  },
  {
    id: 'somon_salbatic',
    name: 'Somon sălbatic la cuptor',
    category: 'proteine',
    caloriesPer100g: 206,
    proteinPer100g: 22.0,
    carbsPer100g: 0,
    fatPer100g: 12.5,
    fibrePer100g: 0,
    isStaple: false,
    isCustom: false,
    sourceNote: 'Protein & Omega-3 EPA/DHA'
  },
  {
    id: 'iaurt_grecesc',
    name: 'Iaurt grecesc 10%',
    category: 'proteine',
    caloriesPer100g: 115,
    proteinPer100g: 9.0,
    carbsPer100g: 3.5,
    fatPer100g: 10.0,
    fibrePer100g: 0,
    isStaple: false,
    isCustom: false,
    sourceNote: 'Cazeină & calciu'
  }
];

/**
 * Registrul oficial al biomarkerilor din Secțiunea 8
 */
export const PROTOCOL_BIOMARKERS: BiomarkerDefinition[] = [
  // --- CORE BIOMARKERS ---
  {
    id: 'apob',
    code: 'ApoB',
    name: 'Apolipoproteina B (ApoB)',
    tier: 'core',
    unit: 'mg/dL',
    optimalMin: 40,
    optimalMax: 65,
    clinicalRefMin: 40,
    clinicalRefMax: 100,
    category: 'lipide',
    cadenceDescription: 'La 6 luni',
    rationale: 'Numărul absolut de particule aterogene circulante (VLDL + IDL + LDL). Cel mai fidel indicator al riscului cardiovascular rezidual.'
  },
  {
    id: 'hba1c',
    code: 'HbA1c',
    name: 'Hemoglobina glicată (HbA1c)',
    tier: 'core',
    unit: '%',
    optimalMin: 4.6,
    optimalMax: 5.3,
    clinicalRefMin: 4.0,
    clinicalRefMax: 5.7,
    category: 'metabolic',
    cadenceDescription: 'La 6 luni',
    rationale: 'Media glicemică pe ultimele 90-120 de zile. Indicator primar pentru stabilitate metabolică și glicare proteică.'
  },
  {
    id: 'triglycerides',
    code: 'TG',
    name: 'Trigliceride serice',
    tier: 'core',
    unit: 'mg/dL',
    optimalMin: 40,
    optimalMax: 80,
    clinicalRefMin: 40,
    clinicalRefMax: 150,
    category: 'lipide',
    cadenceDescription: 'La 6 luni',
    rationale: 'Reflectă clearance-ul particulelor bogate în trigliceride și sensibilitatea la insulină hepatică.'
  },
  {
    id: 'hscrp',
    code: 'hs-CRP',
    name: 'Proteina C-reactivă înalt sensibilă (hs-CRP)',
    tier: 'core',
    unit: 'mg/L',
    optimalMin: 0.1,
    optimalMax: 0.5,
    clinicalRefMin: 0.0,
    clinicalRefMax: 3.0,
    category: 'inflamatie',
    cadenceDescription: 'La 6 luni',
    rationale: 'Biomarker de referință pentru inflamația sistemică vasculară cronică de grad scăzut.'
  },
  {
    id: 'homocysteine',
    code: 'HCY',
    name: 'Homocisteină serică',
    tier: 'core',
    unit: 'µmol/L',
    optimalMin: 5.0,
    optimalMax: 9.0,
    clinicalRefMin: 5.0,
    clinicalRefMax: 15.0,
    category: 'metabolic',
    cadenceDescription: 'La 6 luni',
    rationale: 'Indicator critic al eficienței ciclului metilării și statusului B6/B12/folat.'
  },
  {
    id: 'vitamin_d',
    code: '25-OH-D',
    name: 'Vitamina D (25-Hidroxivitamina D)',
    tier: 'core',
    unit: 'ng/mL',
    optimalMin: 50,
    optimalMax: 70,
    clinicalRefMin: 30,
    clinicalRefMax: 100,
    category: 'vitamine_nutrienti',
    cadenceDescription: 'La 6 luni',
    rationale: 'Securizează imunitatea, transcripția genetică a >1000 de gene și metabolismul osos/muscular.'
  },

  // --- OPȚIONAL ---
  {
    id: 'lpa',
    code: 'Lp(a)',
    name: 'Lipoproteina (a) - Lp(a)',
    tier: 'optional',
    unit: 'mg/dL',
    optimalMin: 0,
    optimalMax: 30,
    clinicalRefMin: 0,
    clinicalRefMax: 50,
    category: 'lipide',
    cadenceDescription: 'Măsurare unică / periodică',
    rationale: 'Factor de risc cardiovascular independent, predominant determinat genetic.'
  },
  {
    id: 'fasting_insulin',
    code: 'Insulina',
    name: 'Insulină à jeun (Fasting Insulin)',
    tier: 'optional',
    unit: 'µIU/mL',
    optimalMin: 2.0,
    optimalMax: 5.0,
    clinicalRefMin: 2.6,
    clinicalRefMax: 24.9,
    category: 'metabolic',
    cadenceDescription: 'La 6 luni',
    rationale: 'Decelează rezistența la insulină cu ani înainte de modificarea glicemiei à jeun.'
  }
];

export const DEFAULT_EXPERIMENTAL_INTERVENTIONS: ExperimentalIntervention[] = [
  {
    id: 'exp_methylene_blue',
    name: 'Methylene Blue (Albastru de Metilen 1%)',
    tier: 'experimental',
    hypothesis: 'Optimizarea fluxului mitocondrial de electroni (complex IV) și claritate cognitivă fără stimulare adrenică.',
    metric: 'Scor subiectiv energie/claritate mentală, performanță Zone 2 / RPE, markeri hepatici la 6 luni.',
    durationWeeks: 8,
    stopCriteria: 'Creșterea pulsului în repaus cu >5 bpm, cefalee persistentă, disconfort gastric sau lipsa oricărui semnal observabil după 4 săptămâni.',
    status: 'active',
    currentCyclePhase: 'ON',
    currentCycleWeek: 6,
    reviewDate: '2026-11-01'
  },
  {
    id: 'exp_citicoline',
    name: 'Citicolină 500 mg',
    tier: 'experimental',
    hypothesis: 'Sprijinirea sintezei de acetilcolină și fosfatidilcolină pentru memorie de lucru și atenție susținută.',
    metric: 'Focus susținut dimineața, calitatea somnului nocturn (fără fragmentare).',
    durationWeeks: 8,
    stopCriteria: 'Insomnie de adormire, tensiune musculară cervicală sau neliniște.',
    status: 'active',
    currentCyclePhase: 'ON',
    currentCycleWeek: 6,
    reviewDate: '2026-11-01'
  },
  {
    id: 'exp_shilajit',
    name: 'Shilajit purificat 400 mg',
    tier: 'experimental',
    hypothesis: 'Aport de acid fulvic și minerale chelate pentru energie celulară și recuperare musculară.',
    metric: 'Recuperare musculară între antrenamentele de forță, toleranță digestivă.',
    durationWeeks: 8,
    stopCriteria: 'Disconfort digestiv sau analize modificate de laborator.',
    status: 'active',
    currentCyclePhase: 'ON',
    currentCycleWeek: 6,
    reviewDate: '2026-11-01'
  }
];
