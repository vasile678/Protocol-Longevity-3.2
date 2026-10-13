import React, { useState } from 'react';
import {
  X,
  Upload,
  Camera,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Check,
  Package,
  Layers,
  FileText
} from 'lucide-react';
import { SupplementDefinition, SupplementProductVersion } from '../types/protocol';

interface ReplaceBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplement: SupplementDefinition;
  activeProduct?: SupplementProductVersion;
  archivedProducts?: SupplementProductVersion[];
  onConfirmReplace: (params: {
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
  }) => Promise<void>;
}

export const ReplaceBrandModal: React.FC<ReplaceBrandModalProps> = ({
  isOpen,
  onClose,
  supplement,
  activeProduct,
  archivedProducts = [],
  onConfirmReplace
}) => {
  const [step, setStep] = useState<'form' | 'compare' | 'history'>('form');

  // Form states
  const [newBrandName, setNewBrandName] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newForm, setNewForm] = useState(activeProduct?.form || 'Capsule');
  const [newServingSize, setNewServingSize] = useState(activeProduct?.servingSize || supplement.doseDescription || '');
  const [newActiveIngredients, setNewActiveIngredients] = useState(activeProduct?.activeIngredients || supplement.activeIngredients || '');
  const [newConcentration, setNewConcentration] = useState(activeProduct?.concentrationPerServing || supplement.doseDescription || '');
  const [newLabelNotes, setNewLabelNotes] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Photo upload / capture
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Te rugăm să încarci un fișier imagine valid (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Imaginea este prea mare (maxim 5 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoDataUrl(event.target?.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Compare active product vs new product
  const currentBrand = activeProduct?.brandName || supplement.currentBrandName || 'Brand nespecificat';
  const currentProd = activeProduct?.productName || supplement.currentProductName || supplement.name;
  const currentFormVal = activeProduct?.form || supplement.currentForm || '—';
  const currentServing = activeProduct?.servingSize || supplement.currentServingSize || supplement.doseDescription;
  const currentConcentrationVal = activeProduct?.concentrationPerServing || supplement.currentConcentration || supplement.doseDescription;
  const currentIngredients = activeProduct?.activeIngredients || supplement.activeIngredients;

  // Detect differences
  const hasConcentrationDiff = currentConcentrationVal.trim().toLowerCase() !== newConcentration.trim().toLowerCase();
  const hasServingDiff = currentServing.trim().toLowerCase() !== newServingSize.trim().toLowerCase();
  const hasIngredientsDiff = currentIngredients.trim().toLowerCase() !== newActiveIngredients.trim().toLowerCase();
  const hasFormDiff = currentFormVal.trim().toLowerCase() !== newForm.trim().toLowerCase();

  const handleProceedToCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) {
      setErrorMessage('Numele noului brand este obligatoriu.');
      return;
    }
    if (!newConcentration.trim()) {
      setErrorMessage('Concentrația / porția noului produs este obligatorie.');
      return;
    }
    setErrorMessage(null);
    setStep('compare');
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const warning = hasConcentrationDiff
        ? `Atenție: Noul brand ${newBrandName} are concentrația declarată "${newConcentration}" (față de "${currentConcentrationVal}"). Protocolul nu modifică automat doza zilnică.`
        : undefined;

      await onConfirmReplace({
        supplementId: supplement.id,
        brandName: newBrandName,
        productName: newProductName.trim() || `${newBrandName} ${supplement.name}`,
        form: newForm,
        servingSize: newServingSize,
        activeIngredients: newActiveIngredients,
        concentrationPerServing: newConcentration,
        labelNotes: newLabelNotes,
        photoDataUrl,
        effectiveStartDate: effectiveDate,
        concentrationChangeWarning: warning
      });

      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error?.message || 'Eroare la înlocuirea brandului.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Înlocuiește Brandul Suplimentului
              </h2>
              <span className="text-[11px] text-cyan-400 font-mono">
                {supplement.name} ({supplement.tierLabel})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch inside modal */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStep('form')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              step === 'form' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Detalii Noul Brand
          </button>
          <button
            type="button"
            onClick={() => {
              if (newBrandName.trim()) setStep('compare');
            }}
            disabled={!newBrandName.trim()}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              step === 'compare'
                ? 'bg-slate-800 text-white shadow-sm'
                : !newBrandName.trim()
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Comparație &amp; Validare
          </button>
          {archivedProducts.length > 0 && (
            <button
              type="button"
              onClick={() => setStep('history')}
              className={`py-1.5 px-2.5 rounded-lg transition-colors ${
                step === 'history' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Istoric ({archivedProducts.length})
            </button>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: FORM */}
        {step === 'form' && (
          <form onSubmit={handleProceedToCompare} className="space-y-3.5 text-xs">
            {/* Governance principle banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-300 block">Regulă de Guvernanță &amp; Integritate:</span>
              <p>
                Brandul anterior este arhivat fără a-i șterge istoricul. Administrările anterioare își păstrează referința originală, iar eventualele diferențe de concentrație sunt evidențiate clar pentru revizuire (fără ajustare automată a dozei).
              </p>
            </div>

            {/* Brand Name & Product Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Nume Brand Nou <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Thorne, Nordic Naturals, Life Extension..."
                  value={newBrandName}
                  onChange={e => setNewBrandName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Denumire Comercială Produs
                </label>
                <input
                  type="text"
                  placeholder={`ex: ${supplement.name}`}
                  value={newProductName}
                  onChange={e => setNewProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Form & Serving size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Formă Farmaceutică</label>
                <select
                  value={newForm}
                  onChange={e => setNewForm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Capsule">Capsule</option>
                  <option value="Comprimate">Comprimate</option>
                  <option value="Pulbere">Pulbere</option>
                  <option value="Picături">Picături / Lichid</option>
                  <option value="Softgel">Softgel</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Mărime Porție (Serving)</label>
                <input
                  type="text"
                  placeholder="ex: 1 capsulă, 5g (1 cupă)"
                  value={newServingSize}
                  onChange={e => setNewServingSize(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Active Ingredients & Concentration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Concentrație per Porție <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 5000 mg, 500 mg EPA / 250 mg DHA"
                  value={newConcentration}
                  onChange={e => setNewConcentration(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Ingrediente Active / Formă Chimică</label>
                <input
                  type="text"
                  placeholder="ex: Creatine Monohydrate, Bisglycinate..."
                  value={newActiveIngredients}
                  onChange={e => setNewActiveIngredients(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Effective Replacement Date */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Data intrării în vigoare a înlocuirii (Effective Date)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-slate-400 font-mono">
                  Istoricul anterior acestei date va păstra brandul precedent.
                </span>
              </div>
            </div>

            {/* Photo Upload & Label Details */}
            <div className="space-y-1.5 pt-1">
              <label className="text-slate-300 font-medium block">
                Fotografie Etichetă / Produs (Salvare Securizată Locală &amp; Backup)
              </label>

              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors text-center">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>{photoDataUrl ? 'Schimbă Fotografia' : 'Încarcă Foto Etichetă'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>

                {photoDataUrl && (
                  <div className="relative group shrink-0">
                    <img
                      src={photoDataUrl}
                      alt="Etichetă produs nou"
                      className="w-12 h-12 rounded-xl object-cover border border-cyan-700/60 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl(undefined)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center"
                      title="Șterge foto"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Label Notes / Excipients / Certification */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Mențiuni Etichetă (Certificări NSF / Informed Choice / Excipienți)
              </label>
              <textarea
                rows={2}
                placeholder="ex: Fără gluten, testat terț pentru metale grele, certificat Creapure..."
                value={newLabelNotes}
                onChange={e => setNewLabelNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950 transition-colors mt-2"
            >
              <span>Continuă spre Comparație &amp; Validare</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: COMPARISON & CONFIRMATION */}
        {step === 'compare' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-bold text-white block">Analiză Comparativă Specificații &amp; Etichetă:</span>
              <p className="text-slate-400 leading-relaxed">
                Verifică diferențele înainte de a arhiva produsul precedent. Dacă există variații de concentrație, acestea vor fi semnalate fără a schimba automat protocolul.
              </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="p-2.5">Parametru</th>
                    <th className="p-2.5 text-slate-300">Brand Anterior (Arhivat)</th>
                    <th className="p-2.5 text-cyan-300">Brand Nou ({newBrandName})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  <tr>
                    <td className="p-2.5 text-slate-400 font-medium">Brand &amp; Produs</td>
                    <td className="p-2.5 text-slate-300">{currentBrand} — {currentProd}</td>
                    <td className="p-2.5 text-cyan-200 font-bold">{newBrandName} — {newProductName || newBrandName}</td>
                  </tr>

                  <tr className={hasFormDiff ? 'bg-amber-950/20' : ''}>
                    <td className="p-2.5 text-slate-400 font-medium">Formă</td>
                    <td className="p-2.5 text-slate-300">{currentFormVal}</td>
                    <td className={`p-2.5 font-bold ${hasFormDiff ? 'text-amber-300' : 'text-slate-200'}`}>
                      {newForm} {hasFormDiff && '(!)'}
                    </td>
                  </tr>

                  <tr className={hasServingDiff ? 'bg-amber-950/20' : ''}>
                    <td className="p-2.5 text-slate-400 font-medium">Mărime Porție</td>
                    <td className="p-2.5 text-slate-300">{currentServing}</td>
                    <td className={`p-2.5 font-bold ${hasServingDiff ? 'text-amber-300' : 'text-slate-200'}`}>
                      {newServingSize} {hasServingDiff && '(!)'}
                    </td>
                  </tr>

                  <tr className={hasConcentrationDiff ? 'bg-amber-950/30 font-semibold' : ''}>
                    <td className="p-2.5 text-slate-400 font-medium">Concentrație</td>
                    <td className="p-2.5 text-slate-300 font-mono">{currentConcentrationVal}</td>
                    <td className={`p-2.5 font-mono ${hasConcentrationDiff ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {newConcentration}
                      {hasConcentrationDiff && (
                        <span className="block text-[10px] text-amber-400 font-normal">
                          ⚠️ Diferență de concentrație detectată
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr className={hasIngredientsDiff ? 'bg-slate-900/40' : ''}>
                    <td className="p-2.5 text-slate-400 font-medium">Ingrediente Active</td>
                    <td className="p-2.5 text-slate-300 text-[11px]">{currentIngredients}</td>
                    <td className="p-2.5 text-slate-200 text-[11px]">{newActiveIngredients}</td>
                  </tr>

                  <tr>
                    <td className="p-2.5 text-slate-400 font-medium">Data Înlocuirii</td>
                    <td className="p-2.5 text-slate-400 font-mono">Până la {effectiveDate}</td>
                    <td className="p-2.5 text-cyan-300 font-mono font-bold">Începând cu {effectiveDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Photo preview if attached */}
            {photoDataUrl && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <img
                  src={photoDataUrl}
                  alt="Etichetă noul produs"
                  className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
                />
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <span className="font-bold text-white block">Fotografie Etichetă Atașată</span>
                  <p className="text-slate-400">
                    Imaginea este salvată în siguranță în IndexedDB și va fi inclusă în seiful criptat (.vault).
                  </p>
                </div>
              </div>
            )}

            {/* Warning if concentration changed */}
            {hasConcentrationDiff && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/60 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400" /> Semnalizare Diferență Concentrație
                </div>
                <p className="leading-relaxed">
                  Concentrația noului produs diferă de cea a brandului precedent. Sistemul nu va schimba automat dozajul prescris de tine în protocol. Verifică numărul de capsule sau măsura de pulbere pentru a menține doza vizată.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Înapoi la Editare
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirm}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 transition-colors"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'Salvare & Arhivare...' : 'Confirmă Înlocuirea Brandului'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BRAND HISTORY / AUDIT */}
        {step === 'history' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Istoric Branduri Arhivate ({archivedProducts.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Integritate păstrată</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {archivedProducts.map(prod => (
                <div
                  key={prod.id}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-white block">{prod.brandName} — {prod.productName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Perioadă activă: {prod.effectiveStartDate} → {prod.effectiveEndDate || 'Prezent'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                      Arhivat
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-900">
                    <div>Formă: {prod.form}</div>
                    <div>Concentrație: {prod.concentrationPerServing}</div>
                  </div>

                  {prod.photoDataUrl && (
                    <div className="pt-1 flex items-center gap-2">
                      <img
                        src={prod.photoDataUrl}
                        alt={prod.brandName}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-800"
                      />
                      <span className="text-[10px] text-slate-400">Foto etichetă salvată</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Înapoi la Formular Înlocuire
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
