import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Clock,
  Flame,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { MealEntry, FoodItem, UserProfile } from '../types/protocol';
import { calculateProteinTargets } from '../utils/calculations';

interface NutritionTabProps {
  selectedDate: string;
  userProfile: UserProfile;
  meals: MealEntry[];
  availableFoods: FoodItem[];
  allRecentMeals: MealEntry[]; // For 7-day trend
  onAddMealEntry: (entry: Omit<MealEntry, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteMealEntry: (id: string) => Promise<void>;
  onAddCustomFood: (food: Omit<FoodItem, 'id'>) => Promise<void>;
}

export const NutritionTab: React.FC<NutritionTabProps> = ({
  selectedDate,
  userProfile,
  meals,
  availableFoods,
  allRecentMeals,
  onAddMealEntry,
  onDeleteMealEntry,
  onAddCustomFood
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);

  // Form states
  const [selectedFoodId, setSelectedFoodId] = useState<string>(availableFoods[0]?.id || '');
  const [selectedMealType, setSelectedMealType] = useState<'masa1' | 'masa2' | 'omad' | 'snack'>('masa1');
  const [gramsInput, setGramsInput] = useState<string>('150');

  // Custom food states
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<'legume' | 'fructe' | 'proteine' | 'grasimi_sanatoase' | 'fermentate_fibre' | 'altele'>('proteine');
  const [customCal, setCustomCal] = useState('150');
  const [customProt, setCustomProt] = useState('20');
  const [customCarbs, setCustomCarbs] = useState('0');
  const [customFat, setCustomFat] = useState('5');
  const [customFibre, setCustomFibre] = useState('0');

  // Fasting window timer states (16:8)
  const [lastMealTime, setLastMealTime] = useState('20:00');
  const [firstMealTime, setFirstMealTime] = useState('12:00');

  // Daily totals
  const totalCalories = Math.round(meals.reduce((s, m) => s + m.calories, 0));
  const totalProtein = Math.round(meals.reduce((s, m) => s + m.protein, 0));
  const totalCarbs = Math.round(meals.reduce((s, m) => s + m.carbs, 0));
  const totalFat = Math.round(meals.reduce((s, m) => s + m.fat, 0));
  const totalFibre = Math.round(meals.reduce((s, m) => s + m.fibre, 0));

  const proteinTarget = calculateProteinTargets(userProfile.weightKg, userProfile.targetProteinGPerKg);
  const proteinPercent = Math.min(100, Math.round((totalProtein / proteinTarget.targetGrams) * 100));
  const fibrePercent = Math.min(100, Math.round((totalFibre / userProfile.targetFibreG) * 100));

  const handleSaveMealEntry = async () => {
    const food = availableFoods.find(f => f.id === selectedFoodId);
    if (!food) return;

    const grams = parseFloat(gramsInput) || 100;
    const ratio = grams / 100;

    await onAddMealEntry({
      date: selectedDate,
      mealType: selectedMealType,
      foodName: food.name,
      grams,
      calories: Math.round(food.caloriesPer100g * ratio),
      protein: parseFloat((food.proteinPer100g * ratio).toFixed(1)),
      carbs: parseFloat((food.carbsPer100g * ratio).toFixed(1)),
      fat: parseFloat((food.fatPer100g * ratio).toFixed(1)),
      fibre: parseFloat((food.fibrePer100g * ratio).toFixed(1)),
      source: food.sourceNote || 'Protocol 3.2 db',
      uncertainty: '±5% estimare analitică'
    });

    setShowAddModal(false);
  };

  const handleSaveCustomFood = async () => {
    if (!customName.trim()) return;

    await onAddCustomFood({
      name: customName.trim(),
      category: customCategory,
      caloriesPer100g: parseFloat(customCal) || 0,
      proteinPer100g: parseFloat(customProt) || 0,
      carbsPer100g: parseFloat(customCarbs) || 0,
      fatPer100g: parseFloat(customFat) || 0,
      fibrePer100g: parseFloat(customFibre) || 0,
      isStaple: false,
      isCustom: true,
      sourceNote: 'Aliment definit de utilizator'
    });

    setShowCustomFoodModal(false);
    setCustomName('');
  };

  // Group meals by type
  const mealGroups: Record<string, MealEntry[]> = {
    masa1: meals.filter(m => m.mealType === 'masa1'),
    masa2: meals.filter(m => m.mealType === 'masa2'),
    omad: meals.filter(m => m.mealType === 'omad'),
    snack: meals.filter(m => m.mealType === 'snack')
  };

  const mealTypeLabels: Record<string, string> = {
    masa1: 'Masa 1 (Prânz / Ruperea postului)',
    masa2: 'Masa 2 (Cina)',
    omad: 'OMAD (Masă Unică Longevity)',
    snack: 'Suplimentar / Gustare'
  };

  // Longitudinal Trend Period state
  const [trendPeriod, setTrendPeriod] = useState<'7' | '30' | '90' | 'all'>('7');

  // Longitudinal trend data (7-day, 30-day, 90-day, all-time)
  const trendData = React.useMemo(() => {
    const today = new Date(selectedDate);
    const daysMap: Record<string, { date: string; fullDate: string; protein: number; fibre: number; calories: number }> = {};

    let daysCount = 7;
    if (trendPeriod === '30') daysCount = 30;
    else if (trendPeriod === '90') daysCount = 90;
    else if (trendPeriod === 'all') daysCount = 180;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayShort = daysCount <= 14
        ? d.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric' })
        : d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
      daysMap[dStr] = { date: dayShort, fullDate: dStr, protein: 0, fibre: 0, calories: 0 };
    }

    allRecentMeals.forEach(m => {
      if (daysMap[m.date]) {
        daysMap[m.date].protein += m.protein;
        daysMap[m.date].fibre += m.fibre;
        daysMap[m.date].calories += m.calories;
      }
    });

    const list = Object.values(daysMap);
    // If viewing 90d or all, sample or show compact list
    return list;
  }, [allRecentMeals, selectedDate, trendPeriod]);

  // Average for selected trend period
  const trendAverages = React.useMemo(() => {
    const logged = trendData.filter(d => d.protein > 0 || d.fibre > 0);
    const count = Math.max(1, logged.length);
    const totalP = logged.reduce((s, d) => s + d.protein, 0);
    const totalF = logged.reduce((s, d) => s + d.fibre, 0);
    return {
      avgProtein: Math.round(totalP / count),
      avgFibre: Math.round(totalF / count),
      daysWithData: logged.length
    };
  }, [trendData]);

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 pt-2">
      {/* Header & Target Formula Card */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Nutriție · Ținte de Longevitate
            </h2>
            <p className="text-[11px] text-slate-400">
              2 mese/zi normale · OMAD 2×/săpt opțional · Fasting 16:8
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adaugă Aliment
          </button>
        </div>

        {/* 4 Macros Cards */}
        <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Calorii</span>
            <span className="text-base font-bold text-white">{totalCalories}</span>
            <span className="text-[9px] text-slate-400 block font-sans">kcal</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-900/40">
            <span className="text-[10px] text-emerald-400 uppercase font-sans block">Proteină</span>
            <span className="text-base font-bold text-emerald-300">{totalProtein}g</span>
            <span className="text-[9px] text-slate-400 block font-sans">/ {proteinTarget.targetGrams}g</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-900/40">
            <span className="text-[10px] text-cyan-400 uppercase font-sans block">Fibre</span>
            <span className="text-base font-bold text-cyan-300">{totalFibre}g</span>
            <span className="text-[9px] text-slate-400 block font-sans">/ {userProfile.targetFibreG}g</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Carb / Grăs</span>
            <span className="text-xs font-bold text-slate-300">{totalCarbs}g / {totalFat}g</span>
            <span className="text-[9px] text-slate-400 block font-sans">macro</span>
          </div>
        </div>

        {/* Detailed protein formula */}
        <div className="space-y-1 pt-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-300 font-medium">Progres Proteină:</span>
            <span className="text-emerald-400 font-mono font-semibold">{proteinPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${proteinPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 pt-0.5">
            Formula: {proteinTarget.formula}
          </p>
        </div>
      </div>

      {/* Fasting 16:8 Tracker */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Fereastră Fasting 16:8
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/50 px-2 py-0.5 rounded-full">
            Țintă: 16 ore post / 8 ore nutriție
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Ultima masă (seara)</span>
            <input
              type="time"
              value={lastMealTime}
              onChange={e => setLastMealTime(e.target.value)}
              className="mt-1 bg-transparent text-sm font-mono text-white focus:outline-none"
            />
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Prima masă (ziua)</span>
            <input
              type="time"
              value={firstMealTime}
              onChange={e => setFirstMealTime(e.target.value)}
              className="mt-1 bg-transparent text-sm font-mono text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Quick Add Staple Foods Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>Alimente de bază Protocol 3.2 (Adăugare rapidă)</span>
          <button
            onClick={() => setShowCustomFoodModal(true)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            + Aliment propriu
          </button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {availableFoods
            .filter(f => f.isStaple)
            .slice(0, 8)
            .map(food => (
              <button
                key={food.id}
                onClick={() => {
                  setSelectedFoodId(food.id);
                  setShowAddModal(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-700 whitespace-nowrap shrink-0 transition-colors"
              >
                + {food.name}
              </button>
            ))}
        </div>
      </div>

      {/* Jurnal Mese */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Mese înregistrate ({meals.length})
        </h3>

        {meals.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Nicio masă înregistrată pentru această dată.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 text-xs font-medium inline-block"
            >
              Înregistrează prima masă
            </button>
          </div>
        ) : (
          Object.entries(mealGroups).map(([typeKey, groupMeals]) => {
            if (groupMeals.length === 0) return null;
            return (
              <div key={typeKey} className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 space-y-2">
                <span className="text-xs font-bold text-cyan-400 block border-b border-slate-800 pb-1">
                  {mealTypeLabels[typeKey] || typeKey}
                </span>

                <div className="space-y-1.5">
                  {groupMeals.map(meal => (
                    <div
                      key={meal.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{meal.foodName}</span>
                          <span className="text-[11px] font-mono text-slate-400">({meal.grams}g)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>{meal.calories} kcal</span>
                          <span>·</span>
                          <span className="text-emerald-400">{meal.protein}g P</span>
                          <span>·</span>
                          <span className="text-cyan-400">{meal.fibre}g F</span>
                          <span>·</span>
                          <span>{meal.carbs}g C / {meal.fat}g G</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400">
                          <Info className="w-2.5 h-2.5" />
                          <span>{meal.source} · {meal.uncertainty}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteMealEntry(meal.id)}
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors"
                        title="Șterge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Longitudinal Trend Chart (7d, 30d, 90d, All-time) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Trend Nutriție Longitudinal
            </h3>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setTrendPeriod('7')}
              className={`px-2 py-0.5 rounded transition-colors ${
                trendPeriod === '7' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7z
            </button>
            <button
              type="button"
              onClick={() => setTrendPeriod('30')}
              className={`px-2 py-0.5 rounded transition-colors ${
                trendPeriod === '30' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              30z
            </button>
            <button
              type="button"
              onClick={() => setTrendPeriod('90')}
              className={`px-2 py-0.5 rounded transition-colors ${
                trendPeriod === '90' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              90z
            </button>
            <button
              type="button"
              onClick={() => setTrendPeriod('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                trendPeriod === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tot
            </button>
          </div>
        </div>

        {/* Period Summary Badges */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono py-1">
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[9px] text-slate-400 font-sans uppercase block">Medie Proteină</span>
            <span className="text-sm font-bold text-emerald-300">{trendAverages.avgProtein}g</span>
            <span className="text-[9px] text-slate-400 block font-sans">/ zi ({trendPeriod === 'all' ? 'istoric' : `${trendPeriod}z`})</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[9px] text-slate-400 font-sans uppercase block">Medie Fibre</span>
            <span className="text-sm font-bold text-cyan-300">{trendAverages.avgFibre}g</span>
            <span className="text-[9px] text-slate-400 block font-sans">/ zi</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[9px] text-slate-400 font-sans uppercase block">Zile Logate</span>
            <span className="text-sm font-bold text-white">{trendAverages.daysWithData}</span>
            <span className="text-[9px] text-slate-400 block font-sans">cu mese</span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  fontSize: '11px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="protein" name="Proteină (g)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fibre" name="Fibre (g)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal Adăugare Aliment */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Înregistrează Aliment în Jurnal
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Masă</label>
                <select
                  value={selectedMealType}
                  onChange={e => setSelectedMealType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="masa1">Masa 1 (Prânz / Ruperea postului)</option>
                  <option value="masa2">Masa 2 (Cina)</option>
                  <option value="omad">OMAD (Masă Unică 2×/săpt)</option>
                  <option value="snack">Suplimentar / Gustare</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Aliment</label>
                <select
                  value={selectedFoodId}
                  onChange={e => setSelectedFoodId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {availableFoods.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.caloriesPer100g} kcal / {f.proteinPer100g}g P / {f.fibrePer100g}g Fibra per 100g)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Cantitate (grame)</label>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={gramsInput}
                  onChange={e => setGramsInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  placeholder="ex: 150"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveMealEntry}
                className="w-1/2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Salvează Masă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aliment Propriu */}
      {showCustomFoodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Adaugă Aliment Personalizat
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Denumire aliment</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="ex: Tofu bio marinat"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Calorii / 100g</label>
                  <input
                    type="number"
                    value={customCal}
                    onChange={e => setCustomCal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Proteină / 100g</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customProt}
                    onChange={e => setCustomProt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Fibre / 100g</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customFibre}
                    onChange={e => setCustomFibre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Carb / 100g</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customCarbs}
                    onChange={e => setCustomCarbs(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCustomFoodModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveCustomFood}
                className="w-1/2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Salvează în DB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
