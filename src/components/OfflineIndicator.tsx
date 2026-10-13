import React, { useEffect, useState } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-950/90 border border-amber-800/80 p-3 text-xs text-amber-200 shadow-xl backdrop-blur-md">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="flex-1 font-medium">
        Mod Offline — Baza de date locală este pe deplin activă. Datele tale rămân securizate pe dispozitiv.
      </span>
    </div>
  );
};

export const StorageWarningBanner: React.FC<{ onDismiss?: () => void }> = ({ onDismiss }) => {
  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 flex items-start gap-3 text-xs text-slate-300">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-semibold text-slate-200">Avertisment stocare locală (IndexedDB)</p>
        <p className="text-slate-400 leading-relaxed">
          Datele de sănătate sunt stocate exclusiv pe acest dispozitiv. Curățarea memoriei cache a browserului poate șterge istoricul. Descarcă periodic un backup criptat din Setări.
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-800"
        >
          Închide
        </button>
      )}
    </div>
  );
};
