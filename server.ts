import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Inițializare client server-side Google GenAI conform skill-ului gemini-api
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Endpoint securizat server-side pentru generarea de sugestii AI Coach
app.post('/api/gemini/insights', async (req, res) => {
  try {
    const { profile, dailyLog, meals, workouts, supplementIntakes, longitudinalMemory, consentGranted } = req.body;

    if (!consentGranted) {
      return res.status(403).json({
        error: 'Consimțământul explicit al utilizatorului este obligatoriu înainte de transmiterea datelor către AI.'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Cheia GEMINI_API_KEY nu este configurată pe server.',
        fallbackToDeterministic: true
      });
    }

    const promptContext = {
      profile: {
        weightKg: profile?.weightKg || 78,
        targetProteinGPerKg: profile?.targetProteinGPerKg || 1.8,
        targetFibreG: profile?.targetFibreG || 30,
        fastingTargetHours: profile?.fastingTargetHours || 16,
        healthGoals: profile?.healthGoals || [],
        dietaryPreferences: profile?.dietaryPreferences || [],
        fitnessTargets: profile?.fitnessTargets || {}
      },
      dailyLog: dailyLog || null,
      mealsCount: meals?.length || 0,
      totalProtein: meals?.reduce((s: number, m: { protein?: number }) => s + (m.protein || 0), 0) || 0,
      totalFibre: meals?.reduce((s: number, m: { fibre?: number }) => s + (m.fibre || 0), 0) || 0,
      totalCalories: meals?.reduce((s: number, m: { calories?: number }) => s + (m.calories || 0), 0) || 0,
      workoutSessionsThisWeek: workouts?.length || 0,
      workoutsList: workouts?.map((w: { type: string; title: string; durationMinutes: number }) => ({
        type: w.type,
        title: w.title,
        minutes: w.durationMinutes
      })) || [],
      supplementsTakenToday: supplementIntakes?.filter((s: { status: string }) => s.status === 'taken').length || 0,
      longitudinalMemory: longitudinalMemory || null
    };

    const systemInstruction = `Ești asistentul analitic clinic al aplicației LONGEVITY 3.2 — Personal Healthspan OS cu Memorie Personală Longitudinală.
Protocolul se bazează pe principiile: Stabilitate > stimulare, Healthspan > biohacking, Minimum effective dose, Fitness > suplimente, Măsurare > presupunere, Sustenabilitate 10+ ani.
Ierarhia protocolului:
- Tier 1 Fundamental: Somn (7-9h), Forță (3-4x/săpt), Zone 2 (2-4x/săpt 30-60m), VO2max (1x/săpt), Nutriție (1.6-2.2 g/kg proteină, ≥30g fibre, fasting 16:8), Lumină circadiană.
- Tier 2 Support: Creatină, Omega-3, Magneziu, Taurină, Glicină, Psyllium, Vit D/K2.
- Tier 3 Experimental: Methylene Blue, Citicolină, Shilajit (8s ON / 2s OFF).

Reguli obligatorii de guvernare și memorie:
1. Returnează MAXIMUM 3 sugestii prioritizate pentru ziua de azi.
2. Bazează sugestiile strict pe datele efective înregistrate (atât curente, cât și mediile longitudinale 7z / 30z).
3. Explică dovada observată (separă clar observația dovedită de sugestia practică).
4. Indică explicit datele lipsă sau insuficiente.
5. Prioritizează fundamentele de stil de viață (Tier 1).
6. Distinge strict observațiile confirmate de simple ipoteze. NICIODATĂ nu asuma că o recomandare anterioară a cauzat direct o îmbunătățire fără dovezi suficiente (corelația nu reprezintă cauzalitate).
7. NICIODATĂ nu diagnostica, nu prescrie medicamente și nu altera din proprie inițiativă dozele sau intervențiile experimentale.
8. Ține cont de acțiunile finalizate anterior de utilizator pentru a evita repetițiile inutile.
9. Răspunde exclusiv în limba română, într-un ton sobru, empatic și riguros medical.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Datele utilizatorului și rezumatul memoriei longitudinale:\n${JSON.stringify(promptContext, null, 2)}\n\nGenerează cele maximum 3 sugestii conform instrucțiunilor.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Titlu scurt și clar al sugestiei' },
              observation: { type: Type.STRING, description: 'Dovada observată din datele înregistrate' },
              suggestion: { type: Type.STRING, description: 'Acțiune concretă sustenabilă recomandată' },
              missingDataNotes: { type: Type.STRING, description: 'Ce date lipsesc sau sunt insuficiente (opțional)' },
              priority: { type: Type.STRING, enum: ['high', 'medium', 'low'], description: 'Nivel prioritate' },
              category: { type: Type.STRING, enum: ['sleep', 'fitness', 'nutrition', 'supplements', 'recovery'], description: 'Pilonul vizat' }
            },
            required: ['title', 'observation', 'suggestion', 'priority', 'category']
          }
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    const results = (Array.isArray(parsed) ? parsed : []).slice(0, 3).map((item, idx) => ({
      ...item,
      id: `ai_${Date.now()}_${idx}`,
      date: new Date().toISOString().split('T')[0],
      isDeterministic: false,
      createdAt: new Date().toISOString()
    }));

    return res.json({ insights: results });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Eroare apel Gemini API server-side:', error?.message || error);
    return res.status(500).json({
      error: 'Eroare la procesarea cererii AI pe server. Te rugăm să încerci din nou sau să folosești sugestiile deterministe offline.',
      fallbackToDeterministic: true
    });
  }
});

// Verificare sănătate server
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Longevity 3.2 — Personal Healthspan OS',
    time: new Date().toISOString()
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Longevity 3.2 pornit la http://0.0.0.0:${PORT}`);
  });
}

startServer();
