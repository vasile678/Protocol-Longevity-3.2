import React, { useState } from 'react';
import {
  Dumbbell,
  Heart,
  Zap,
  Activity,
  Plus,
  Trash2,
  Calendar,
  Scale,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import {
  WorkoutSession,
  BodyMeasurement,
  WorkoutType
} from '../types/protocol';
import {
  calculateWeeklyFitnessProgress,
  formatRomanianDate
} from '../utils/calculations';

interface FitnessTabProps {
  selectedDate: string;
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  onAddWorkout: (workout: Omit<WorkoutSession, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteWorkout: (id: string) => Promise<void>;
  onAddMeasurement: (measurement: Omit<BodyMeasurement, 'id' | 'createdAt'>) => Promise<void>;
}

export const FitnessTab: React.FC<FitnessTabProps> = ({
  selectedDate,
  workouts,
  measurements,
  onAddWorkout,
  onDeleteWorkout,
  onAddMeasurement
}) => {
  const [showAddWorkoutModal, setShowAddWorkoutModal] = useState(false);
  const [showAddMeasurementModal, setShowAddMeasurementModal] = useState(false);

  // Form states for workout
  const [workoutType, setWorkoutType] = useState<WorkoutType>('strength');
  const [workoutTitle, setWorkoutTitle] = useState('Antrenament Forță Compus');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [avgHr, setAvgHr] = useState('');
  const [rpe, setRpe] = useState('7');
  const [strengthFocus, setStrengthFocus] = useState<Array<'picioare' | 'sold' | 'impins' | 'tras' | 'core' | 'grip'>>([
    'picioare',
    'impins'
  ]);
  const [notes, setNotes] = useState('');

  // Form states for measurement
  const [weightKg, setWeightKg] = useState('78');
  const [waistCm, setWaistCm] = useState('84');
  const [bodyFat, setBodyFat] = useState('15.5');
  const [muscleMass, setMuscleMass] = useState('35.2');
  const [vo2max, setVo2max] = useState('48');

  // Filter workouts for selected date vs all
  const todayWorkouts = workouts.filter(w => w.date === selectedDate);
  const weeklyProgress = calculateWeeklyFitnessProgress(workouts);

  // Latest measurements
  const sortedMeasurements = [...measurements].sort((a, b) => b.date.localeCompare(a.date));
  const latestMeasurement = sortedMeasurements[0];

  const handleSaveWorkout = async () => {
    await onAddWorkout({
      date: selectedDate,
      type: workoutType,
      title: workoutTitle.trim() || 'Sesiune Antrenament',
      durationMinutes: parseInt(durationMinutes, 10) || 30,
      avgHeartRate: avgHr ? parseInt(avgHr, 10) : undefined,
      rpe: parseInt(rpe, 10) || 7,
      strengthFocus: workoutType === 'strength' ? strengthFocus : undefined,
      exercisesNotes: notes.trim(),
      completed: true
    });
    setShowAddWorkoutModal(false);
    setNotes('');
  };

  const handleSaveMeasurement = async () => {
    await onAddMeasurement({
      date: selectedDate,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      waistCircumferenceCm: waistCm ? parseFloat(waistCm) : undefined,
      bodyFatPercentage: bodyFat ? parseFloat(bodyFat) : undefined,
      muscleMassKg: muscleMass ? parseFloat(muscleMass) : undefined,
      vo2maxEstimate: vo2max ? parseFloat(vo2max) : undefined
    });
    setShowAddMeasurementModal(false);
  };

  // Longitudinal Period state
  const [measPeriod, setMeasPeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  // Chart data for weight/waist trend
  const measurementChartData = React.useMemo(() => {
    let limit = 30;
    if (measPeriod === '7') limit = 7;
    else if (measPeriod === '30') limit = 30;
    else if (measPeriod === '90') limit = 90;
    else if (measPeriod === 'all') limit = 365;

    const filtered = sortedMeasurements.slice(0, limit).reverse();
    return filtered.map(m => ({
      date: m.date.slice(5),
      greutate: m.weightKg,
      talie: m.waistCircumferenceCm,
      fat: m.bodyFatPercentage
    }));
  }, [sortedMeasurements, measPeriod]);

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 pt-2">
      {/* Header */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Fitness · Pilonul Central al Healthspan-ului
            </h2>
            <p className="text-[11px] text-slate-400">
              Forță &gt; Suplimente · Fără scoruri biologice fabricate
            </p>
          </div>
          <button
            onClick={() => setShowAddWorkoutModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adaugă Sesiune
          </button>
        </div>

        {/* 4 Pillars Progress Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* 1. Forță */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white">1. Forță</span>
              <Dumbbell className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {weeklyProgress.strength.completed} <span className="text-xs text-slate-400">/ 3–4×</span>
            </div>
            <span className={`text-[10px] block font-mono ${
              weeklyProgress.strength.status === 'atins' ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {weeklyProgress.strength.status === 'atins' ? '✓ Obiectiv atins' : 'În curs săptămâna'}
            </span>
          </div>

          {/* 2. Zone 2 */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white">2. Zone 2</span>
              <Heart className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {weeklyProgress.zone2.completedSessions} <span className="text-xs text-slate-400">/ 2–4×</span>
            </div>
            <span className="text-[10px] block text-cyan-400 font-mono">
              {weeklyProgress.zone2.totalMinutes} min aerobic
            </span>
          </div>

          {/* 3. VO2max */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white">3. VO₂max</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {weeklyProgress.vo2max.completed} <span className="text-xs text-slate-400">/ 1×</span>
            </div>
            <span className={`text-[10px] block font-mono ${
              weeklyProgress.vo2max.status === 'atins' ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {weeklyProgress.vo2max.status === 'atins' ? '✓ Realizat' : '1 sesiune/săpt'}
            </span>
          </div>

          {/* 4. Mobility */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white">4. Mobilitate</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {weeklyProgress.mobility.completed} <span className="text-xs text-slate-400">/ 3–5×</span>
            </div>
            <span className="text-[10px] block text-slate-400 font-mono">
              10–15 min/sesiune
            </span>
          </div>
        </div>
      </div>

      {/* Body Measurements & Composition Card */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Compoziție Corporală &amp; Metrici
            </h3>
          </div>
          <button
            onClick={() => setShowAddMeasurementModal(true)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            + Măsurătoare nouă
          </button>
        </div>

        {latestMeasurement ? (
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-sans block">Greutate</span>
              <span className="text-base font-bold text-white">
                {latestMeasurement.weightKg ? `${latestMeasurement.weightKg} kg` : '—'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-sans block">Talie</span>
              <span className="text-base font-bold text-white">
                {latestMeasurement.waistCircumferenceCm ? `${latestMeasurement.waistCircumferenceCm} cm` : '—'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-sans block">% Grăsime</span>
              <span className="text-base font-bold text-cyan-300">
                {latestMeasurement.bodyFatPercentage ? `${latestMeasurement.bodyFatPercentage}%` : '—'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-sans block">VO₂max</span>
              <span className="text-base font-bold text-emerald-300">
                {latestMeasurement.vo2maxEstimate ? `${latestMeasurement.vo2maxEstimate}` : '—'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950 text-center text-xs text-slate-400">
            Nicio măsurătoare salvată. Apasă pe „+ Măsurătoare nouă” pentru a înregistra greutatea și circumferința taliei.
          </div>
        )}

        {/* Trend chart if available */}
        {measurementChartData.length > 1 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Trend Greutate &amp; Talie ({measPeriod === 'all' ? 'Istoric' : `${measPeriod}z`})
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setMeasPeriod('7')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    measPeriod === '7' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  7z
                </button>
                <button
                  type="button"
                  onClick={() => setMeasPeriod('30')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    measPeriod === '30' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  30z
                </button>
                <button
                  type="button"
                  onClick={() => setMeasPeriod('90')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    measPeriod === '90' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  90z
                </button>
                <button
                  type="button"
                  onClick={() => setMeasPeriod('all')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    measPeriod === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tot
                </button>
              </div>
            </div>

            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={measurementChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                  <Line type="monotone" dataKey="greutate" name="Greutate (kg)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="talie" name="Talie (cm)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Sesiuni Antrenamente (Lista) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Antrenamente Logate ({workouts.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            {todayWorkouts.length} azi ({formatRomanianDate(selectedDate)})
          </span>
        </div>

        {workouts.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-2">
            <p className="text-xs text-slate-400">Niciun antrenament înregistrat încă.</p>
            <button
              onClick={() => setShowAddWorkoutModal(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 text-xs font-medium inline-block"
            >
              Înregistrează antrenament
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {workouts.map(session => (
              <div
                key={session.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{session.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 uppercase">
                      {session.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {session.date}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-mono flex items-center gap-2">
                    <span>{session.durationMinutes} min</span>
                    {session.avgHeartRate && <span>· HR {session.avgHeartRate} bpm</span>}
                    {session.rpe && <span>· RPE {session.rpe}/10</span>}
                  </div>

                  {session.strengthFocus && session.strengthFocus.length > 0 && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <span className="text-[10px] text-slate-400">Accent:</span>
                      {session.strengthFocus.map(f => (
                        <span key={f} className="text-[9px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-orange-300">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  {session.exercisesNotes && (
                    <p className="text-[11px] text-slate-400 pt-0.5">
                      {session.exercisesNotes}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onDeleteWorkout(session.id)}
                  className="text-slate-400 hover:text-rose-400 p-2 rounded transition-colors"
                  title="Șterge"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Adăugare Antrenament */}
      {showAddWorkoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Înregistrează Antrenament
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Tip Sesiune Protocol</label>
                <select
                  value={workoutType}
                  onChange={e => {
                    const t = e.target.value as WorkoutType;
                    setWorkoutType(t);
                    if (t === 'strength') setWorkoutTitle('Forță compusă (picioare/șold/împins)');
                    if (t === 'zone2') setWorkoutTitle('Zone 2 Aerobic (ciclism/jogging)');
                    if (t === 'vo2max') setWorkoutTitle('VO₂max Intervale Zone 5 (4×4)');
                    if (t === 'mobility') setWorkoutTitle('Stabilitate & Mobilitate');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="strength">Forță (3–4×/săpt · Pilon central)</option>
                  <option value="zone2">Zone 2 (2–4×/săpt · 30–60 min)</option>
                  <option value="vo2max">VO₂max / Zone 5 (1×/săpt · Scurt & intens)</option>
                  <option value="mobility">Stabilitate & Mobilitate (3–5×/săpt · 10–15 min)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Titlu sesiune</label>
                <input
                  type="text"
                  value={workoutTitle}
                  onChange={e => setWorkoutTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Durată (min)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">HR mediu</label>
                  <input
                    type="number"
                    value={avgHr}
                    onChange={e => setAvgHr(e.target.value)}
                    placeholder="ex: 135"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">RPE (1–10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={rpe}
                    onChange={e => setRpe(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              {workoutType === 'strength' && (
                <div>
                  <label className="text-slate-400 block mb-1">Accent Protocol (selectează grupe)</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['picioare', 'sold', 'impins', 'tras', 'core', 'grip'] as const).map(focus => {
                      const isSelected = strengthFocus.includes(focus);
                      return (
                        <button
                          key={focus}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setStrengthFocus(strengthFocus.filter(f => f !== focus));
                            } else {
                              setStrengthFocus([...strengthFocus, focus]);
                            }
                          }}
                          className={`py-1 rounded text-[11px] font-medium border capitalize ${
                            isSelected
                              ? 'bg-orange-950 border-orange-600 text-orange-200'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {focus}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Note exerciții / greutăți</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ex: Genuflexiuni 4x8 100kg, Împins culcat 4x8 80kg"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddWorkoutModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveWorkout}
                className="w-1/2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Salvează Sesiune
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adăugare Măsurătoare */}
      {showAddMeasurementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Înregistrează Măsurătoare Corporală
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Greutate (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Circumferință talie (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={waistCm}
                    onChange={e => setWaistCm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">% Grăsime corporală</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyFat}
                    onChange={e => setBodyFat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">VO₂max estimat</label>
                  <input
                    type="number"
                    step="0.5"
                    value={vo2max}
                    onChange={e => setVo2max(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddMeasurementModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveMeasurement}
                className="w-1/2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Salvează Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
