// Funzione serverless (Vercel Functions). Chiama l'API di Groq con la chiave
// conservata SOLO lato server (variabile d'ambiente GROQ_API_KEY), mai
// esposta al browser. Se la chiave non è configurata, o la chiamata fallisce
// per qualsiasi motivo, risponde con needsFallback:true e il frontend userà
// automaticamente il motore euristico locale (src/utils/ideaOrganizer.js) —
// il sito funziona comunque anche senza chiave.
//
// Groq espone un'API compatibile con il formato OpenAI, quindi la chiamata
// usa /chat/completions con response_format json_object.

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Sei un assistente che riorganizza note personali scritte in italiano.
Regole:
- Correggi grammatica e ortografia MA non cambiare il significato originale.
- Classifica ogni informazione in una di queste categorie: "attivita", "idea", "informazione", "scadenza".
- Per ogni attività con una data/ora individuabile (anche relativa, es. "domani", "venerdì", "10 agosto"), crea un oggetto task con:
  - title: titolo BREVE e naturale dell'azione, SENZA includere la data o l'ora (es. "Parrucchiere", non "Parrucchiere domani alle 19")
  - date: data assoluta in formato ISO 8601, calcolata rispetto alla data odierna fornita
  - category: una tra "Lavoro", "Personale", "Urgente", "Altro"
  - certainty: "certa" se la data è chiara ed esplicita, "incerta" se è vaga (es. "la prossima settimana", "prima di partire")
- Genera anche un titolo di sintesi breve per l'intera nota (campo suggestedTitle), solo se ha senso farlo.
- Rispondi SOLO con JSON valido, nessun testo fuori dal JSON, in questo formato esatto:
{
  "suggestedTitle": "string o null",
  "sections": {
    "attivita": ["stringa pulita", ...],
    "idea": ["stringa pulita", ...],
    "informazione": ["stringa pulita", ...],
    "scadenza": ["stringa pulita", ...]
  },
  "tasks": [
    { "title": "string", "date": "ISO 8601 o null", "category": "string", "certainty": "certa|incerta" }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo non consentito' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(200).json({ needsFallback: true, reason: 'GROQ_API_KEY non configurata' });
    return;
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Testo mancante' });
      return;
    }

    const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
    const today = new Date().toISOString();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Data odierna: ${today}\n\nNota da organizzare:\n"""${text}"""` }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Errore Groq API:', response.status, errText);
      res.status(200).json({ needsFallback: true, reason: 'Errore del servizio IA' });
      return;
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      res.status(200).json({ needsFallback: true, reason: 'Risposta IA vuota' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/^```json|```$/g, '').trim());
    } catch (e) {
      console.error('Risposta IA non in JSON valido:', raw);
      res.status(200).json({ needsFallback: true, reason: 'Risposta IA non valida' });
      return;
    }

    res.status(200).json({ needsFallback: false, result: parsed, provider: 'groq' });
  } catch (e) {
    console.error('Errore organize-note:', e);
    res.status(200).json({ needsFallback: true, reason: 'Errore imprevisto' });
  }
}
