import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  replaceSupplementBrand
} from '../utils/brandReplacementEngine.ts';
import {
  SupplementDefinition,
  SupplementProductVersion,
  SupplementIntake
} from '../types/protocol.ts';

describe('Longevity 3.2 — Replace Brand & Historical Product Versioning', () => {
  it('arhivează produsul anterior setând isArchived și effectiveEndDate fără a pierde istoricul', () => {
    const previousProduct: SupplementProductVersion = {
      id: 'prod_creatine_v1',
      supplementId: 'creatine',
      brandName: 'Brand A (Creapure Generic)',
      productName: 'Creatine Monohydrate',
      form: 'Pulbere',
      servingSize: '5 g',
      activeIngredients: 'Creatine Monohydrate 5g',
      concentrationPerServing: '5000 mg',
      effectiveStartDate: '2026-09-01',
      isArchived: false,
      createdAt: '2026-09-01T00:00:00Z'
    };

    const supplementDef: SupplementDefinition = {
      id: 'creatine',
      name: 'Creatină monohidrat',
      tier: 'support',
      tierLabel: 'Tier 2 — Support',
      timing: 'dimineata',
      doseDescription: '5 g / zi',
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      activeIngredients: 'Creatine monohydrate 5g',
      isCycling: false,
      governanceNote: 'Tier 2 Support',
      currentBrandName: previousProduct.brandName,
      currentProductId: previousProduct.id,
      currentConcentration: previousProduct.concentrationPerServing
    };

    const effectiveDate = '2026-10-15';
    const result = replaceSupplementBrand({
      supplementDef,
      existingProducts: [previousProduct],
      params: {
        supplementId: 'creatine',
        brandName: 'Thorne',
        productName: 'Thorne Creatine',
        form: 'Pulbere',
        servingSize: '5 g (1 măsură)',
        activeIngredients: 'Creapure Creatine Monohydrate',
        concentrationPerServing: '5000 mg',
        labelNotes: 'NSF Certified for Sport',
        effectiveStartDate: effectiveDate,
        photoDataUrl: 'data:image/png;base64,mockphotodata'
      }
    });

    // 1. Verificare noul produs generat
    assert.strictEqual(result.newProduct.supplementId, 'creatine');
    assert.strictEqual(result.newProduct.brandName, 'Thorne');
    assert.strictEqual(result.newProduct.isArchived, false);
    assert.strictEqual(result.newProduct.effectiveStartDate, '2026-10-15');
    assert.strictEqual(result.newProduct.photoDataUrl, 'data:image/png;base64,mockphotodata');

    // 2. Verificare că produsul anterior este arhivat cu data de sfârșit
    assert.strictEqual(result.updatedProducts.length, 2);
    const archived = result.updatedProducts.find(p => p.id === 'prod_creatine_v1')!;
    assert.strictEqual(archived.isArchived, true);
    assert.strictEqual(archived.effectiveEndDate, '2026-10-15');

    // 3. Verificare definiție supliment actualizată
    assert.strictEqual(result.updatedSupplementDef.currentBrandName, 'Thorne');
    assert.strictEqual(result.updatedSupplementDef.currentProductId, result.newProduct.id);
  });

  it('detectează și semnalizează modificările de concentrație fără a schimba automat doza protocolului', () => {
    const previousOmega3: SupplementProductVersion = {
      id: 'prod_omega3_v1',
      supplementId: 'omega3',
      brandName: 'Nordic Naturals Ultimate Omega',
      productName: 'Ultimate Omega',
      form: 'Softgel',
      servingSize: '1 capsulă',
      activeIngredients: 'EPA 500mg, DHA 250mg',
      concentrationPerServing: '750 mg Total Omega-3 (500mg EPA / 250mg DHA)',
      effectiveStartDate: '2026-09-01',
      isArchived: false,
      createdAt: '2026-09-01T00:00:00Z'
    };

    const suppDef: SupplementDefinition = {
      id: 'omega3',
      name: 'Omega-3',
      tier: 'support',
      tierLabel: 'Tier 2 — Support',
      timing: 'dimineata',
      doseDescription: '1 capsulă (500 mg EPA, 250 mg DHA)',
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      activeIngredients: 'EPA 500mg, DHA 250mg',
      isCycling: false,
      governanceNote: 'Tier 2 Support',
      currentBrandName: previousOmega3.brandName,
      currentProductId: previousOmega3.id,
      currentConcentration: previousOmega3.concentrationPerServing
    };

    // Înlocuire cu un brand cu concentrație diferită (ex: Carlson Elite cu 800mg EPA / 400mg DHA)
    const result = replaceSupplementBrand({
      supplementDef: suppDef,
      existingProducts: [previousOmega3],
      params: {
        supplementId: 'omega3',
        brandName: 'Carlson',
        productName: 'Elite Omega-3 Gems',
        form: 'Softgel',
        servingSize: '1 capsulă',
        activeIngredients: 'EPA 800mg, DHA 400mg',
        concentrationPerServing: '1200 mg Total Omega-3 (800mg EPA / 400mg DHA)',
        effectiveStartDate: '2026-10-12',
        concentrationChangeWarning: 'Atenție: Noul brand Carlson are concentrație diferită (1200 mg vs 750 mg). Doza protocolului rămâne 1 capsulă conform deciziei tale.'
      }
    });

    // Doza descrisă în protocol rămâne nemodificată
    assert.strictEqual(result.updatedSupplementDef.doseDescription, '1 capsulă (500 mg EPA, 250 mg DHA)');
    // Se afișează semnalizarea de atenționare
    assert.ok(result.updatedSupplementDef.concentrationReviewFlag?.includes('Atenție: Noul brand Carlson'));
    assert.strictEqual(result.newProduct.concentrationChangeWarning, result.updatedSupplementDef.concentrationReviewFlag);
  });

  it('asociază corect înregistrările istorice de administrare cu produsul lor original', () => {
    const historicalIntakes: SupplementIntake[] = [
      { id: 'i1', date: '2026-09-10', supplementId: 'creatine', productId: 'prod_creatine_v1', productBrand: 'Brand A', status: 'taken' },
      { id: 'i2', date: '2026-09-11', supplementId: 'creatine', productId: 'prod_creatine_v1', productBrand: 'Brand A', status: 'taken' }
    ];

    // Când se adaugă o administrare nouă după înlocuire
    const newIntake: SupplementIntake = {
      id: 'i3',
      date: '2026-10-15',
      supplementId: 'creatine',
      productId: 'prod_creatine_v2',
      productBrand: 'Thorne',
      status: 'taken'
    };

    const allIntakes = [...historicalIntakes, newIntake];

    // Istoricul vechi nu este alterat
    const intake1 = allIntakes.find(i => i.id === 'i1')!;
    assert.strictEqual(intake1.productId, 'prod_creatine_v1');
    assert.strictEqual(intake1.productBrand, 'Brand A');

    // Noul intake are noul produs
    const intake3 = allIntakes.find(i => i.id === 'i3')!;
    assert.strictEqual(intake3.productId, 'prod_creatine_v2');
    assert.strictEqual(intake3.productBrand, 'Thorne');
  });
});
