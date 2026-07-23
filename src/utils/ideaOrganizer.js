// Motore euristico "Sistema le mie idee": non è un vero modello linguistico,
// ma un parser reale basato su regole che riconosce date, orari e attività
// nel testo libero delle note e propone eventi/attività da salvare in calendario.

const MONTHS = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11
};

const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

function nextWeekday(base, targetDow) {
  const d = new Date(base);
  const diff = (targetDow - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseDateHints(sentence, now) {
  const lower = sentence.toLowerCase();
  let date = null;

  if (/\boggi\b/.test(lower)) {
    date = new Date(now);
  } else if (/\bdomani\b/.test(lower)) {
    date = new Date(now);
    date.setDate(date.getDate() + 1);
  } else if (/dopodomani/.test(lower)) {
    date = new Date(now);
    date.setDate(date.getDate() + 2);
  }

  if (!date) {
    for (let i = 0; i < WEEKDAYS.length; i++) {
      const name = WEEKDAYS[i];
      if (lower.includes(name)) {
        date = nextWeekday(now, i);
        break;
      }
    }
  }

  // Formato "10 agosto" o "il 10 agosto"
  const monthMatch = lower.match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const month = MONTHS[monthMatch[2]];
    date = new Date(now.getFullYear(), month, day);
    if (date < now) date.setFullYear(date.getFullYear() + 1);
  }

  // Formato numerico "10/08" o "10-08-2026"
  const numMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (numMatch && !date) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10) - 1;
    const year = numMatch[3] ? (numMatch[3].length === 2 ? 2000 + parseInt(numMatch[3], 10) : parseInt(numMatch[3], 10)) : now.getFullYear();
    date = new Date(year, month, day);
  }

  // Orario "alle 15", "alle 15:30", "ore 9"
  const timeMatch = lower.match(/\b(?:alle|ore)\s+(\d{1,2})(?:[:.](\d{2}))?\b/);
  let hours = 9, minutes = 0;
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  }

  if (date) {
    date.setHours(hours, minutes, 0, 0);
  }

  return date;
}

// Parole chiave che indicano un'azione/impegno da fare
const ACTION_HINTS = [
  'chiamare', 'prenotare', 'consegnare', 'consegna', 'incontrare', 'inviare',
  'pagare', 'comprare', 'finire', 'completare', 'scrivere', 'preparare',
  'organizzare', 'rispondere', 'appuntamento', 'riunione', 'scadenza', 'ritirare'
];

const PRIORITY_HINTS = ['urgente', 'importante', 'priorità', 'entro oggi', 'subito', 'asap'];

function splitSentences(text) {
  return text
    .split(/\n|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function organizeIdeas(rawText) {
  const now = new Date();
  const sentences = splitSentences(rawText);

  const bullets = [];
  const tasks = [];

  sentences.forEach((sentence) => {
    const lower = sentence.toLowerCase();
    const hasAction = ACTION_HINTS.some((w) => lower.includes(w));
    const date = parseDateHints(sentence, now);
    const isPriority = PRIORITY_HINTS.some((w) => lower.includes(w));

    bullets.push({ text: sentence, priority: isPriority });

    if (hasAction || date) {
      tasks.push({
        title: sentence,
        date: date ? date.toISOString() : null,
        priority: isPriority
      });
    }
  });

  // Costruisce un testo organizzato in paragrafi + elenco puntato
  const priorityBullets = bullets.filter((b) => b.priority);
  const normalBullets = bullets.filter((b) => !b.priority);

  let organizedText = '';
  if (priorityBullets.length) {
    organizedText += '⚠️ Priorità:\n' + priorityBullets.map((b) => `• ${b.text}`).join('\n') + '\n\n';
  }
  organizedText += 'Note:\n' + normalBullets.map((b) => `• ${b.text}`).join('\n');

  return { organizedText: organizedText.trim(), tasks };
}
