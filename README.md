# LONGEVITY 3.2 — PERSONAL HEALTHSPAN OS

Sistem de operare personal pentru longevitate și sănătate, mobile-first, Progressive Web App (PWA) proiectat pentru un utilizator privat, conform specificațiilor din **Protocolul Longevity 3.2 (Governed Edition)**.

---

## 1. Arhitectură și Principii de Guvernare

Aplicația se conformează strict ierarhiei protocolului:
- **Principiul fundamental:** `USER PROTOCOL ≠ MEDICAL FACT ≠ CURRENT RECOMMENDATION`.
- **Stabilitate > stimulare · Healthspan > biohacking · Minimum effective dose · Fitness > suplimente · Măsurare > presupunere · Ciclare anti-adaptare · Sustenabilitate 10+ ani`.

### Ierarhia Protocolului:
1. **TIER 1 — FUNDAMENTAL (Core Healthspan):**
   - Somn nocturn (7–9 ore, oră stabilă, lumină redusă, cameră răcoroasă).
   - Forță (3–4×/săptămână: picioare, șold, împins, tras, core, grip).
   - Zone 2 (2–4×/săptămână: 30–60 min/sesiune, eficiență metabolică).
   - VO₂max / Zone 5 (1×/săptămână: scurtă și intensă).
   - Mobilitate & Stabilitate (3–5×/săptămână: 10–15 min).
   - Nutriție (1.6–2.2 g/kg/zi proteină calculată dinamic, ≥30 g/zi fibre, fasting 16:8, alimente de bază integrale).
   - Lumină circadiană (10–20 min dimineața) + hidratare (400 ml apă + ~1 g sare).
2. **TIER 2 — SUPPORT (Conditional / Support):**
   - Creatină 5g, Taurină (dimineața 1500mg + seara 1500mg), Omega-3 (500mg EPA / 250mg DHA), Magneziu bisglicinat, Vitamina D3 + K2 (L/M/V), Methyl B-Complex (L/M/V), Glicină 3g (seara), Magneziu L-treonat 2 capsule (seara), Psyllium 5g/zi.
   - Zinc 25mg (Ma/Jo seara) — condiționat de necesitate/status nutrițional.
3. **TIER 3 — EXPERIMENTAL:**
   - Methylene Blue (5 picături sol. 1% Ma/Jo dimineața).
   - Citicolină (500 mg dimineața).
   - Shilajit (400 mg dimineața la cafea).
   - **Ciclare:** 8 săptămâni ON urmate de 2 săptămâni pauză (OFF).

---

## 2. Ambiguități Identificate și Rezolvate

1. **Orar Săptămânal Citicolină:**
   - *Text Sursă:* Secțiunea 5 specifică „500 mg — L/M/V”, în timp ce Secțiunea 10 menționează „1 capsula dimineata L/M/J”.
   - *Soluție Implementată:* În fila **Suplimente** și în **Setări**, utilizatorul poate comuta transparent între orarul L/M/V și L/M/J printr-un click, fără interpretări ascunse.
2. **Aplicabilitatea Ciclării Tier 3:**
   - *Text Sursă:* Secțiunea 5 specifică ciclarea 8 săptămâni ON / 2 săptămâni OFF pentru Methylene Blue, iar Secțiunea 10 aplică regula la nivelul întregului Tier 3 experimental.
   - *Soluție Implementată:* Tracker-ul de ciclare cuantifică faza curentă, săptămâna și zilele rămase cu pornire configurabilă din Setări.
3. **Fără Scoruri Biologice Fabricate:**
   - Nu se inventează scoruri artificiale de „vârstă biologică” sau procente imaginare. Toate metricele reflectă strict valorile efectiv introduse.

---

## 3. Confidențialitatea Datelor & Securitate

- **Zero Telemetrie / Zero Trackere:** Aplicația nu include SDK-uri terțe de tracking.
- **Local-First IndexedDB:** Datele sunt stocate exclusiv în browserul dispozitivului prin Dexie.
- **Backup Criptat AES-GCM 256-bit:** Utilizatorul poate descărca un pachet securizat cu parolă personală (Web Crypto API PBKDF2 + AES-GCM).
- **Consimțământ Explicit AI:** Nicio dată nu părăsește dispozitivul către Gemini fără activarea explicită a comutatorului de consimțământ. Utilizatorul poate previzualiza exact JSON-ul minim transmis.
- **Fallback Determinist Offline:** Când conexiunea lipsește sau utilizatorul refuză transmiterea externă, motorul determinist local generează automat cele 3 sugestii prioritizate pe baza regulilor protocolului.

---

## 4. Instalare și Rulare Locală

### Cerințe preliminare:
- Node.js 20+
- npm 10+

### Pași:
```bash
# 1. Clonare depozit
git clone <repo-url>
cd longevity-3.2-os

# 2. Instalare dependințe
npm install

# 3. Rulare teste unitare pentru calcule
npm test

# 4. Pornire server de dezvoltare full-stack (port 3000)
npm run dev
```

Deschide `http://localhost:3000` în browser sau în emulatorul mobil Chrome DevTools.

---

## 5. Ghid de Implementare și Deploy pe GitHub Pages

Workflow-ul automatizat este configurat în `.github/workflows/deploy.yml`.

1. Pe GitHub, accesează depozitul -> **Settings** -> **Pages**.
2. La secțiunea **Build and deployment**, selectează **Source: GitHub Actions**.
3. La fiecare push pe branch-ul `main`, workflow-ul:
   - Rulează testele unitare (`npm test`).
   - Construiește bundle-ul PWA cu căi relative (`BASE_URL='./' npm run build`).
   - Publică automat pe GitHub Pages la adresa `https://<username>.github.io/<repo>/`.

---

## 6. Checklist Testare Mobilă (Mobile Testing Checklist)

- [ ] **Viewport & Ergonomie:** Butoanele inferioare au înălțime $\ge 44\text{px}$ și sunt accesibile facil cu o singură mână în Natural Reach Zone (partea de jos 40%).
- [ ] **PWA Install prompt:** Funcționează pe Android / Chromium prin dialogul nativ și oferă ghid pas-cu-pas pe iOS Safari („Share” -> „Add to Home Screen”).
- [ ] **Offline:** Aplicația se încarcă și funcționează complet cu modul Avion activat (IndexedDB + Service Worker Workbox).
- [ ] **Viteză rutină (<2 minute):** Bifarea somnului, apei matinale, luminii și a suplimentelor din fila **Astăzi** durează sub 60 de secunde.
- [ ] **Calcul Proteină:** Verifică modificarea greutății în Setări (ex: 80 kg) -> Ținta dinamică devine automat $80 \times 1.8 = 144\text{ g}$.
- [ ] **Zile Suplimente:** Verifică dacă Vitamina D3+K2 apare doar L/M/V, iar Methylene Blue doar Ma/Jo.
- [ ] **Export & Restaurare Criptată:** Exportă un fișier `.vault` cu parolă, curăță datele din aplicație și restaurează-le cu succes.
