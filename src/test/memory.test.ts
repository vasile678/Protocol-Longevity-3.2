import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateLongitudinalMetrics,
  buildAIMemorySummary,
  identifyLongitudinalShifts
} from '../utils/longitudinalEngine.ts';
import { verifyBackupIntegrity } from '../db/index.ts';
import { DEFAULT_USER_PROFILE } from '../data/protocolData.ts';
import {
  DailyLog,
  MealEntry,
  WorkoutSession,
  SupplementIntake,
  BodyMeasurement,
  AIInsight,
  ExportBackupPayload
} from '../types/protocol.ts';

describe('Longevity 3.2 — Personal Health Memory & Longitudinal Engine', () => {
  const mockLogs: DailyLog[] = [
    { date: '2026-10-10', sleepHours: 8.0, sleepQuality: 9, updatedAt: '' },
    { date: '2026-10-11', sleepHours: 7.5, sleepQuality: 8, updatedAt: '' },
    { date: '2026-10-12', sleepHours: 7.0, sleepQuality: 7, updatedAt: '' }
  ];

  const mockMeals: MealEntry[] = [
    { id: 'm1', date: '2026-10-10', mealType: 'masa1', foodName: 'Ouă și somon', grams: 250, calories: 520, protein: 42, carbs: 4, fat: 34, fibre: 2, source: 'Protocol', uncertainty: '±5%', createdAt: '' },
    { id: 'm2', date: '2026-10-10', mealType: 'masa2', foodName: 'Piept de pui & legume', grams: 350, calories: 650, protein: 55, carbs: 20, fat: 22, fibre: 14, source: 'Protocol', uncertainty: '±5%', createdAt: '' },
    { id: 'm3', date: '2026-10-11', mealType: 'masa1', foodName: 'Chefir & Psyllium', grams: 200, calories: 180, protein: 12, carbs: 10, fat: 6, fibre: 9, source: 'Protocol', uncertainty: '±5%', createdAt: '' },
    { id: 'm4', date: '2026-10-12', mealType: 'masa1', foodName: 'Omletă & Avocado', grams: 300, calories: 580, protein: 35, carbs: 5, fat: 42, fibre: 8, source: 'Protocol', uncertainty: '±5%', createdAt: '' }
  ];

  const mockWorkouts: WorkoutSession[] = [
    { id: 'w1', date: '2026-10-10', type: 'strength', title: 'Forță Picioare', durationMinutes: 50, completed: true, createdAt: '' },
    { id: 'w2', date: '2026-10-11', type: 'zone2', title: 'Zone 2 Ciclism', durationMinutes: 45, completed: true, createdAt: '' },
    { id: 'w3', date: '2026-10-12', type: 'strength', title: 'Forță Împins', durationMinutes: 45, completed: true, createdAt: '' }
  ];

  const mockIntakes: SupplementIntake[] = [
    { id: 'i1', date: '2026-10-10', supplementId: 'creatine', status: 'taken' },
    { id: 'i2', date: '2026-10-10', supplementId: 'omega3', status: 'taken' },
    { id: 'i3', date: '2026-10-11', supplementId: 'creatine', status: 'taken' },
    { id: 'i4', date: '2026-10-12', supplementId: 'creatine', status: 'skipped' }
  ];

  const mockMeas: BodyMeasurement[] = [
    { id: 'b1', date: '2026-10-06', weightKg: 78.5, waistCircumferenceCm: 84.5, createdAt: '' },
    { id: 'b2', date: '2026-10-12', weightKg: 77.8, waistCircumferenceCm: 83.8, createdAt: '' }
  ];

  const mockInsights: AIInsight[] = [
    { id: 'ins1', date: '2026-10-10', title: 'Creștere aport fibre', observation: 'Fibre sub 30g', suggestion: 'Adaugă psyllium', priority: 'medium', category: 'nutrition', isDeterministic: true, feedback: 'completed', createdAt: '' },
    { id: 'ins2', date: '2026-10-11', title: 'Somn optim', observation: 'Somn 7.5h', suggestion: 'Menține ora de culcare', priority: 'low', category: 'sleep', isDeterministic: true, feedback: 'useful', createdAt: '' }
  ];

  it('calculează cu acuratețe metricile longitudinale 7z / 30z', () => {
    const m7 = calculateLongitudinalMetrics(7, mockLogs, mockMeals, mockWorkouts, mockIntakes, mockMeas, mockInsights, '2026-10-12');

    assert.strictEqual(m7.daysLogged, 3);
    assert.strictEqual(m7.averageSleepHours, 7.5); // (8 + 7.5 + 7) / 3 = 7.5
    assert.strictEqual(m7.averageSleepQuality, 8.0); // (9 + 8 + 7) / 3 = 8.0
    assert.strictEqual(m7.strengthSessionsTotal, 2);
    assert.strictEqual(m7.zone2MinutesTotal, 45);
    assert.strictEqual(m7.completedActionsCount, 1);
    assert.strictEqual(m7.supplementAdherencePct, 75); // 3 taken din 4
    assert.strictEqual(m7.weightDeltaKg, -0.7); // 77.8 - 78.5 = -0.7
    assert.strictEqual(m7.waistDeltaCm, -0.7); // 83.8 - 84.5 = -0.7
  });

  it('sintetizează un rezumat minim de memorie AI conform principiilor de confidențialitate', () => {
    const summary = buildAIMemorySummary(mockLogs, mockMeals, mockWorkouts, mockIntakes, mockMeas, mockInsights, '2026-10-12');

    assert.ok(summary.past7dAverages.sleepHours > 0);
    assert.ok(summary.past7dAverages.proteinG > 0);
    assert.strictEqual(summary.previousCompletedActions.length, 1);
    assert.ok(summary.previousCompletedActions[0].includes('Creștere aport fibre'));
    assert.strictEqual(summary.previousUsefulInsights.length, 1);
    assert.strictEqual(summary.previousUsefulInsights[0], 'Somn optim');
    // Ipotezele sunt păstrate distincte de faptele confirmate
    assert.ok(summary.hypothesesUnderReview.length > 0);
  });

  it('detectează deviațiile și schimbările comportamentale recente (identifyLongitudinalShifts)', () => {
    const m7 = calculateLongitudinalMetrics(7, mockLogs, mockMeals, mockWorkouts, mockIntakes, mockMeas, mockInsights, '2026-10-12');
    const m30 = {
      ...m7,
      averageSleepHours: 8.2, // 7z e 7.5 vs 30z e 8.2 -> scădere de 0.7h
      averageProteinG: 85,
      supplementAdherencePct: 95
    };

    const shifts = identifyLongitudinalShifts(m7, m30);
    assert.ok(shifts.length >= 1);
    assert.ok(shifts.some(s => s.includes('Somnul') && s.includes('a scăzut')));
  });

  it('validează integritatea structurii de backup și respinge payload-urile invalide', () => {
    const validBackup: ExportBackupPayload = {
      version: '3.2.0',
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      app: 'Longevity 3.2 — Personal Healthspan OS',
      userProfile: DEFAULT_USER_PROFILE,
      dailyLogs: mockLogs,
      mealEntries: mockMeals,
      foodItems: [],
      supplementIntakes: mockIntakes,
      workoutSessions: mockWorkouts,
      bodyMeasurements: mockMeas,
      labResults: [],
      labDocuments: [],
      aiInsights: mockInsights,
      experimentalInterventions: []
    };

    const validCheck = verifyBackupIntegrity(validBackup);
    assert.strictEqual(validCheck.valid, true);
    assert.strictEqual(validCheck.errors.length, 0);
    assert.strictEqual(validCheck.recordCounts.dailyLogs, 3);

    // Test payload corupt (app greșit sau userProfile lipsă)
    const corruptedBackup = {
      ...validBackup,
      app: 'Unknown App',
      userProfile: null as any
    };

    const invalidCheck = verifyBackupIntegrity(corruptedBackup);
    assert.strictEqual(invalidCheck.valid, false);
    assert.ok(invalidCheck.errors.length >= 2);
  });
});
