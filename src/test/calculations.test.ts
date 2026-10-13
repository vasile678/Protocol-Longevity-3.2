import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateProteinTargets,
  isSupplementScheduledForDate,
  calculateExperimentalCycle,
  calculateWeeklyFitnessProgress
} from '../utils/calculations.ts';
import { PROTOCOL_SUPPLEMENTS } from '../data/protocolData.ts';

describe('Longevity 3.2 — Core Calculations Test Suite', () => {
  it('calculează corect ținta de proteine în intervalul 1.6 - 2.2 g/kg conform greutății', () => {
    // Greutate 75 kg, factor implicit 1.8 g/kg
    const res75 = calculateProteinTargets(75, 1.8);
    assert.strictEqual(res75.minGrams, 120); // 75 * 1.6 = 120
    assert.strictEqual(res75.maxGrams, 165); // 75 * 2.2 = 165
    assert.strictEqual(res75.targetGrams, 135); // 75 * 1.8 = 135

    // Greutate 80 kg, factor 2.0 g/kg
    const res80 = calculateProteinTargets(80, 2.0);
    assert.strictEqual(res80.minGrams, 128); // 80 * 1.6 = 128
    assert.strictEqual(res80.maxGrams, 176); // 80 * 2.2 = 176
    assert.strictEqual(res80.targetGrams, 160); // 80 * 2.0 = 160
  });

  it('programează corect suplimentele pe zilele săptămânii', () => {
    // Creatina este zilnic (0-6)
    const creatine = PROTOCOL_SUPPLEMENTS.find(s => s.id === 'creatine')!;
    const monday = new Date('2026-10-12T10:00:00Z'); // Luni (getDay = 1)
    const sunday = new Date('2026-10-18T10:00:00Z'); // Duminică (getDay = 0)
    assert.strictEqual(isSupplementScheduledForDate(creatine, monday), true);
    assert.strictEqual(isSupplementScheduledForDate(creatine, sunday), true);

    // Methylene Blue este doar Marți (2) și Joi (4)
    const mb = PROTOCOL_SUPPLEMENTS.find(s => s.id === 'methylene_blue')!;
    const tuesday = new Date('2026-10-13T10:00:00Z'); // Marți (2)
    const wednesday = new Date('2026-10-14T10:00:00Z'); // Miercuri (3)
    const thursday = new Date('2026-10-15T10:00:00Z'); // Joi (4)

    assert.strictEqual(isSupplementScheduledForDate(mb, tuesday), true);
    assert.strictEqual(isSupplementScheduledForDate(mb, wednesday), false);
    assert.strictEqual(isSupplementScheduledForDate(mb, thursday), true);
  });

  it('respectă orarul configurat pentru ambiguitatea Citicolinei (LMV vs LMJ)', () => {
    const citicoline = PROTOCOL_SUPPLEMENTS.find(s => s.id === 'citicoline')!;
    const friday = new Date('2026-10-16T10:00:00Z'); // Vineri (5)
    const thursday = new Date('2026-10-15T10:00:00Z'); // Joi (4)

    // Când e configurat LMV: Vineri e activ, Joi nu
    assert.strictEqual(isSupplementScheduledForDate(citicoline, friday, 'LMV'), true);
    assert.strictEqual(isSupplementScheduledForDate(citicoline, thursday, 'LMV'), false);

    // Când e configurat LMJ: Joi e activ, Vineri nu
    assert.strictEqual(isSupplementScheduledForDate(citicoline, friday, 'LMJ'), false);
    assert.strictEqual(isSupplementScheduledForDate(citicoline, thursday, 'LMJ'), true);
  });

  it('calculează fazele ciclului experimental 8 săptămâni ON → 2 săptămâni OFF', () => {
    const startDate = '2026-09-01'; // Ziua 0 a ciclului 1
    // După 14 zile (2 săptămâni): Faza ON, Săptămâna 3
    const day14 = new Date('2026-09-15T10:00:00Z');
    const cycleDay14 = calculateExperimentalCycle(startDate, day14, 8, 2);
    assert.strictEqual(cycleDay14.phase, 'ON');
    assert.strictEqual(cycleDay14.currentWeekInPhase, 3);
    assert.strictEqual(cycleDay14.cycleIndex, 1);

    // După 60 zile: 8 săptămâni ON (56 zile) s-au încheiat -> Faza OFF (ziua 4 din cele 14 zile OFF)
    const day60 = new Date('2026-10-31T10:00:00Z');
    const cycleDay60 = calculateExperimentalCycle(startDate, day60, 8, 2);
    assert.strictEqual(cycleDay60.phase, 'OFF');
    assert.strictEqual(cycleDay60.currentWeekInPhase, 1);
  });

  it('calculează progresul săptămânal față de obiectivele fitness ale protocolului', () => {
    const testSessions = [
      { id: '1', date: '2026-10-12', type: 'strength', title: 'Forță Picioare', durationMinutes: 50, completed: true, createdAt: '' },
      { id: '2', date: '2026-10-13', type: 'zone2', title: 'Zone 2 Ciclism', durationMinutes: 45, completed: true, createdAt: '' },
      { id: '3', date: '2026-10-14', type: 'strength', title: 'Forță Împins/Tras', durationMinutes: 55, completed: true, createdAt: '' },
      { id: '4', date: '2026-10-15', type: 'mobility', title: 'Mobilitate șold', durationMinutes: 15, completed: true, createdAt: '' }
    ] as any;

    const progress = calculateWeeklyFitnessProgress(testSessions);
    assert.strictEqual(progress.strength.completed, 2);
    assert.strictEqual(progress.zone2.completedSessions, 1);
    assert.strictEqual(progress.zone2.totalMinutes, 45);
    assert.strictEqual(progress.mobility.completed, 1);
    assert.strictEqual(progress.vo2max.completed, 0);
  });
});
