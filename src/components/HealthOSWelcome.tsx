import React from 'react';
import { ArrowUpRight, Activity, FlaskConical, MessageCircle, Moon, Pill, Sparkles } from 'lucide-react';
import type { TabType } from './Navigation';

type Props = {
  selectedDate: string;
  sleepHours?: number;
  supplementCompleted: number;
  supplementScheduled: number;
  labCount: number;
  onNavigate: (tab: TabType) => void;
};

export function HealthOSWelcome({
  selectedDate, sleepHours, supplementCompleted, supplementScheduled, labCount, onNavigate
}: Props) {
  const dateLabel = new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(selectedDate + 'T12:00:00Z'));

  const metrics = [
    { label: 'Somn', value: typeof sleepHours === 'number' && sleepHours > 0 ? `${sleepHours} h` : 'Fără date', icon: Moon, tab: 'today' as TabType },
    { label: 'Protocol', value: supplementScheduled ? `${supplementCompleted} / ${supplementScheduled}` : 'Nimic programat', icon: Pill, tab: 'supplements' as TabType },
    { label: 'Analize', value: labCount ? `${labCount} rezultate` : 'Fără date', icon: FlaskConical, tab: 'labs' as TabType }
  ];

  return (
    <section aria-label="AI Health OS — prezentare generală" className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-[#101c29] to-[#0c2224] px-5 py-7 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-teal-300 uppercase">
            <Activity size={16} aria-hidden="true" /> AI Health OS
          </div>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Sănătatea ta, într-un singur loc.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            Monitorizează obiceiurile, urmărește rezultatele și explorează informații despre longevitate.
          </p>
          <p className="mt-2 text-xs capitalize text-slate-400">{dateLabel}</p>
          <button
            type="button"
            onClick={() => onNavigate('ai')}
            className="mt-7 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-600/70 bg-white/10 px-4 py-4 text-left text-sm text-slate-200 shadow-lg shadow-black/10 transition-colors hover:border-teal-300/60 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 sm:max-w-lg"
          >
            <span className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-teal-300" aria-hidden="true" /> Întreabă AI Coach despre sănătatea ta</span>
            <ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => onNavigate('nutrition')} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">Nutriție</button>
            <button onClick={() => onNavigate('fitness')} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">Fitness</button>
            <button onClick={() => onNavigate('labs')} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">Biomarkeri</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, tab }) => (
          <button key={label} type="button" onClick={() => onNavigate(tab)}
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition-colors hover:border-teal-600/60">
            <span className="rounded-xl bg-slate-800 p-2.5 text-teal-300"><Icon size={19} aria-hidden="true" /></span>
            <span><span className="block text-xs text-slate-400">{label}</span><span className="block text-base font-semibold text-white">{value}</span></span>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">Valorile reflectă numai datele înregistrate în aplicație. AI Coach nu înlocuiește consultul medical.</p>
    </section>
  );
}
