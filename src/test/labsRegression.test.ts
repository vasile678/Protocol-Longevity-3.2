import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PROTOCOL_BIOMARKERS, DEFAULT_USER_PROFILE } from '../data/protocolData.ts';
import {
  evaluateLabResultAlert,
  getActiveAlerts,
  isBiomarkerAlertEnabled
} from '../utils/labAlertsEngine.ts';
import { BiomarkerDefinition, LabResult } from '../types/protocol.ts';

describe('Longevity 3.2 — LabTests & Mobile Layout Safety Regression Suite', () => {
  it('garantează că PROTOCOL_BIOMARKERS este un registru valid și complet (8 biomarkeri oficiali)', () => {
    assert(Array.isArray(PROTOCOL_BIOMARKERS));
    assert(PROTOCOL_BIOMARKERS.length >= 8);
    const apob = PROTOCOL_BIOMARKERS.find(b => b.id === 'apob');
    assert(apob !== undefined);
    assert.strictEqual(apob.unit, 'mg/dL');
    assert.strictEqual(apob.tier, 'core');

    const tg = PROTOCOL_BIOMARKERS.find(b => b.id === 'triglycerides');
    assert(tg !== undefined);
    assert.strictEqual(tg.unit, 'mg/dL');
  });

  it('protejează împotriva erorii fatale de render când prop-ul biomarkers este un array gol []', () => {
    // Simulare caz de pornire înainte de rezolvarea asincronă a bazei de date
    const emptyBiomarkers: BiomarkerDefinition[] = [];
    const safeBiomarkers = (emptyBiomarkers && emptyBiomarkers.length > 0) ? emptyBiomarkers : PROTOCOL_BIOMARKERS;
    
    assert(safeBiomarkers.length > 0);
    const selectedBiomarkerId = 'apob';
    const currentBiomarker = safeBiomarkers.find(b => b.id === selectedBiomarkerId) || safeBiomarkers[0];
    
    assert(currentBiomarker !== undefined, 'currentBiomarker nu trebuie să fie undefined niciodată');
    assert.strictEqual(typeof currentBiomarker.id, 'string');
    assert.strictEqual(currentBiomarker.id, 'apob');

    // Verifică că isBiomarkerAlertEnabled nu aruncă excepție
    const alertsEnabled = isBiomarkerAlertEnabled(currentBiomarker.id, currentBiomarker, DEFAULT_USER_PROFILE);
    assert.strictEqual(typeof alertsEnabled, 'boolean');
  });

  it('filtrează și sortează rezultatele chiar dacă rezultatele sunt undefined sau conțin date goale', () => {
    const safeBiomarker = PROTOCOL_BIOMARKERS[0];
    const results: LabResult[] = [
      {
        id: 'res_1',
        biomarkerId: safeBiomarker.id,
        testDate: '2026-05-10',
        value: 65,
        unit: 'mg/dL',
        referenceInterval: '< 80',
        laboratory: 'Synevo',
        createdAt: '2026-05-10T10:00:00Z'
      },
      {
        id: 'res_2',
        biomarkerId: safeBiomarker.id,
        testDate: '2026-10-12',
        value: 60,
        unit: 'mg/dL',
        referenceInterval: '< 80',
        laboratory: 'Synevo',
        createdAt: '2026-10-12T10:00:00Z'
      }
    ];

    const biomarkerResults = (results || [])
      .filter(r => r.biomarkerId === safeBiomarker.id)
      .sort((a, b) => (a.testDate || '').localeCompare(b.testDate || ''));

    assert.strictEqual(biomarkerResults.length, 2);
    assert.strictEqual(biomarkerResults[0].testDate, '2026-05-10');
    assert.strictEqual(biomarkerResults[1].testDate, '2026-10-12');

    const latest = biomarkerResults[biomarkerResults.length - 1];
    assert.strictEqual(latest.value, 60);
  });

  it('evaluează corect alertele active chiar dacă există rezultate cu ID-uri necunoscute', () => {
    const results: LabResult[] = [
      {
        id: 'unknown_res',
        biomarkerId: 'non_existent_bio',
        testDate: '2026-10-10',
        value: 999,
        unit: 'mg/dL',
        referenceInterval: '< 100',
        laboratory: 'TestLab',
        createdAt: '2026-10-10T08:00:00Z'
      }
    ];

    const safeBiomarkers = PROTOCOL_BIOMARKERS;
    const activeAlerts = getActiveAlerts(results || []).filter(a => {
      const bio = safeBiomarkers.find(b => b.id === a.biomarkerId);
      return isBiomarkerAlertEnabled(a.biomarkerId, bio, DEFAULT_USER_PROFILE);
    });

    assert(Array.isArray(activeAlerts));
  });

  it('permite adăugarea unui rezultat de laborator valid fără erori de referință', () => {
    const biomarker = PROTOCOL_BIOMARKERS.find(b => b.id === 'apob')!;
    const newAlert = evaluateLabResultAlert({
      result: {
        id: 'test_lab_res',
        biomarkerId: biomarker.id,
        testDate: '2026-10-16',
        value: 62,
        unit: 'mg/dL',
        referenceInterval: '< 80 mg/dL',
        laboratory: 'MedLife'
      },
      biomarker,
      userProfile: DEFAULT_USER_PROFILE
    });

    assert.strictEqual(newAlert.severity, 'normal');
    assert.strictEqual(newAlert.direction, 'in_range');
    assert.strictEqual(newAlert.isCritical, false);
  });
});
