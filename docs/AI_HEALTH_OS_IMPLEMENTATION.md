# AI Health OS — Audit inițial și plan de implementare

## Stare verificată
- Ramură izolată: `ai-health-os`, derivată din `main`.
- React 19 + TypeScript + Vite 8 + Tailwind 4.
- PWA prin vite-plugin-pwa; Dexie / IndexedDB pentru date locale.
- Componente existente: Navigation, TodayTab, NutritionTab, SupplementsTab, FitnessTab, LabTestsTab, AICoachTab, SettingsModal.
- App.tsx gestionează datele, acțiunile și navigarea între taburi.
- TodayTab are deja indicatori reali pentru somn, nutriție, antrenamente, suplimente și rezultate de laborator.
- README precizează că scorurile de vârstă biologică nu trebuie fabricate.

## Obiectiv
Reorganizare UI inspirată de Perplexity, fără înlocuirea logicii de sănătate sau pierderea datelor locale.

## Implementare etapizată
1. Dashboard: ierarhie vizuală nouă, carduri bazate exclusiv pe date introduse, CTA către AI Coach.
2. Navigare: desktop sidebar + navigare mobilă accesibilă; păstrarea rutelor/taburilor actuale.
3. AI Coach: experiență de căutare/conversație mai clară; păstrarea mecanismului de consimțământ pentru transfer extern.
4. Biomarkeri și protocol: lizibilitate, filtre, grafice, fără schimbarea calculelor clinice.
5. QA: `npm install`, `npm run lint`, `npm test`, `npm run build`, test mobil și verificare persistență IndexedDB.

## Constrângeri
- Nu se modifică ramura `main` până la validare.
- Nu se afișează scoruri Health Score, Biological Age, HRV sau Recovery inventate.
- Nu se trimit date de sănătate către AI fără consimțământ explicit.
- Nu se stochează chei API în codul frontend.
- Un design nou nu este considerat validat până la build și teste.

## Următoarea schimbare de cod
Componentă nouă de prezentare pentru Dashboard, integrată incremental în TodayTab, cu păstrarea handlerelor existente.
