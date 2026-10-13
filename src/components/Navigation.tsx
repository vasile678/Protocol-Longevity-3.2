import React from 'react';
import {
  Calendar,
  Utensils,
  Pill,
  Activity,
  FlaskConical,
  Sparkles,
  Settings as SettingsIcon,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatShortDate } from '../utils/calculations';

export type TabType = 'today' | 'nutrition' | 'supplements' | 'fitness' | 'labs' | 'ai';

interface NavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedDate: string;
  onDateChange: (dateStr: string) => void;
  onOpenSettings: () => void;
  isInstallable: boolean;
  onInstallApp: () => void;
}

export const TopBar: React.FC<{
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenSettings: () => void;
  isInstallable: boolean;
  onInstallApp: () => void;
  isMemoryActive?: boolean;
}> = ({
  selectedDate,
  onDateChange,
  onOpenSettings,
  isInstallable,
  onInstallApp,
  isMemoryActive
}) => {
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleTodayClick = () => {
    onDateChange(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <header className="sticky top-0 z-40 bg-[#080c14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Zone 1: Wordmark & Memorie Activa indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center">
            <span className="text-cyan-400 font-bold text-sm tracking-tight">3.2</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white leading-none">
                LONGEVITY <span className="text-cyan-400">3.2</span>
              </h1>
              {isMemoryActive && (
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[9px] font-mono tracking-tight" title="Persistență locală IndexedDB verificată">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Memorie activă
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">
              HEALTHSPAN OS
            </span>
          </div>
        </div>

        {/* Zone 2: Date Quick Navigator */}
        <div className="flex items-center gap-1 bg-slate-900/90 rounded-lg border border-slate-800 p-0.5">
          <button
            onClick={handlePrevDay}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Ziua precedentă"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleTodayClick}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
              isToday
                ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-800/50'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {isToday ? 'Astăzi' : formatShortDate(selectedDate)}
          </button>

          <button
            onClick={handleNextDay}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Ziua următoare"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isMemoryActive && (
            <span className="sm:hidden flex items-center gap-1 text-[9px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              Memorie
            </span>
          )}

          {isInstallable && (
            <button
              onClick={onInstallApp}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 text-xs font-medium hover:bg-cyan-900/70 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalează</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Setări și Date"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export const BottomTabBar: React.FC<{
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'today' as TabType, label: 'Astăzi', icon: Calendar },
    { id: 'nutrition' as TabType, label: 'Nutriție', icon: Utensils },
    { id: 'supplements' as TabType, label: 'Suplimente', icon: Pill },
    { id: 'fitness' as TabType, label: 'Fitness', icon: Activity },
    { id: 'labs' as TabType, label: 'Analize', icon: FlaskConical },
    { id: 'ai' as TabType, label: 'AI Coach', icon: Sparkles }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080c14]/95 backdrop-blur-lg border-t border-slate-800/90 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-6 h-16 items-center px-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
                isActive
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute top-1.5 w-6 h-0.5 rounded-full bg-cyan-400" />
              )}
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-full px-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
