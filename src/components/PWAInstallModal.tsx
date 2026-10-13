import React from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Instalare PWA pe Smartphone
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p className="font-semibold text-cyan-300">
            Pentru acces instant și funcționare autonomă offline:
          </p>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Pe iPhone / Safari:</span>
            <div className="flex items-start gap-2">
              <Share className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>1. Apasă pe butonul <strong>Partajează (Share)</strong> din bara Safari.</span>
            </div>
            <div className="flex items-start gap-2">
              <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>2. Derulează în jos și alege <strong>Adaugă pe ecranul principal (Add to Home Screen)</strong>.</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-white block">Pe Android / Chrome:</span>
            <p className="text-slate-400">
              Apasă pe meniul din colțul de sus (cele 3 puncte) și selectează <strong>„Instalează aplicația”</strong> sau <strong>„Adaugă pe ecranul principal”</strong>.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
        >
          Am înțeles
        </button>
      </div>
    </div>
  );
};
