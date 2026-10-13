/**
 * LONGEVITY 3.2 — BRAND REPLACEMENT & PRODUCT VERSIONING ENGINE
 * Deterministic business logic for archiving previous brands and linking new products.
 */

import {
  SupplementDefinition,
  SupplementProductVersion
} from '../types/protocol';

export interface ReplaceBrandInput {
  supplementDef: SupplementDefinition;
  existingProducts: SupplementProductVersion[];
  params: {
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
  };
}

export interface ReplaceBrandResult {
  newProduct: SupplementProductVersion;
  updatedProducts: SupplementProductVersion[];
  updatedSupplementDef: SupplementDefinition;
}

export function replaceSupplementBrand(input: ReplaceBrandInput): ReplaceBrandResult {
  const { supplementDef, existingProducts, params } = input;
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

  // Archive previous active products
  const updatedProducts = existingProducts.map(p => {
    if (p.supplementId === params.supplementId && !p.isArchived) {
      return {
        ...p,
        isArchived: true,
        effectiveEndDate: params.effectiveStartDate
      };
    }
    return p;
  });

  updatedProducts.push(newProduct);

  const updatedSupplementDef: SupplementDefinition = {
    ...supplementDef,
    currentProductId: newProduct.id,
    currentBrandName: newProduct.brandName,
    currentProductName: newProduct.productName,
    currentForm: newProduct.form,
    currentServingSize: newProduct.servingSize,
    currentConcentration: newProduct.concentrationPerServing,
    currentPhotoDataUrl: newProduct.photoDataUrl,
    concentrationReviewFlag: params.concentrationChangeWarning
  };

  return {
    newProduct,
    updatedProducts,
    updatedSupplementDef
  };
}
