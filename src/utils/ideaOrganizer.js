// Motore euristico "Sistema la mia nota" v3.
// Nota onesta sui limiti: questo NON è un modello linguistico vero. È un parser
// basato su regole che pulisce il testo, lo classifica in categorie e separa
// titolo/data/ora/categoria delle attività. Rispetto a un vero LLM non può
// riformulare liberamente il significato, ma lavora in modo affidabile e
// prevedibile su pattern ricorrenti in italiano.

const MONTHS = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11
};
const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

const HIGH_PRIORITY_HINTS = ['urgente', 'importante', 'priorità alta', 'subito', 'asap', 'entro oggi', 'scadenza'];
const MEDIUM_PRIORITY_HINTS = ['entro', 'da fare', 'ricordare', 'non dimenticare'];

const ACTION_VERBS = [
  'chiamare', 'prenotare', 'consegnare', 'consegna', 'incontrare', 'inviare', 'mandare',
  'pagare', 'comprare', 'finire', 'completare', 'scrivere', 'preparare', 'andare',
  'organizzare', 'rispondere', 'ritirare', 'fissare', 'confermare'
];

const IDEA_HINTS = ['voglio', 'vorrei', 'idea', 'forse', 'magari', 'pensavo', 'sarebbe bello', 'mi piacerebbe'];

const PROJECT_HINTS = [
  'creare', 'progetto', 'progettare', 'lanciare', 'costruire', 'aprire un', 'avviare',
  'ristorante', 'startup', 'attività', 'locale', 'business', 'brand', 'app', 'sito'
];

const VAGUE_HINTS = [
  'entro venerdì', 'entro la settimana', 'la prossima settimana', 'prossima settimana',
  'prima di partire', 'entro fine mese', 'a breve', 'quando possibile', 'entro lunedì',
  'entro sabato', 'entro domenica', 'entro martedì', 'entro mercoledì', 'entro giovedì'
];

const FILLER_PREFIXES = [
  'devo ', 'ricordami di ', 'ricordati di ', 'bisogna ', 'dovrei ', 'vorrei ',
  'devi ', 'poi ', 'e poi ', 'inoltre '
];

function nextWeekday(base, targetDow) {
  const d = new Date(base);
  const diff = (targetDow - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

// Individua e restituisce la data/ora, più le sotto-stringhe da rimuovere dal titolo
function extractDateTime(sentence, now) {
  const lower = sentence.toLowerCase();
  let date = null;
  const matchedFragments = [];

  if (/\boggi\b/.test(lower)) { date = new Date(now); matchedFragments.push('oggi'); }
  else if (/\bdomani\b/.test(lower)) { date = new Date(now); date.setDate(date.getDate() + 1); matchedFragments.push('domani'); }
  else if (/dopodomani/.test(lower)) { date = new Date(now); date.setDate(date.getDate() + 2); matchedFragments.push('dopodomani'); }

  if (!date) {
    for (let i = 0; i < WEEKDAYS.length; i++) {
      const name = WEEKDAYS[i];
      if (lower.includes(name) && !lower.includes(`entro ${name}`)) {
        date = nextWeekday(now, i);
        matchedFragments.push(name);
        break;
      }
    }
  }

  const monthMatch = lower.match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const month = MONTHS[monthMatch[2]];
    date = new Date(now.getFullYear(), month, day);
    if (date < now) date.setFullYear(date.getFullYear() + 1);
    matchedFragments.push(monthMatch[0]);
  }

  const timeMatch = lower.match(/\b(?:alle|ore)\s+(\d{1,2})(?:[:.](\d{2}))?\b/);
  let hours = 9, minutes = 0;
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    matchedFragments.push(timeMatch[0]);
  }

  if (date) date.setHours(hours, minutes, 0, 0);
  return { date, matchedFragments };
}

function detectVagueHint(sentence, now) {
  const lower = sentence.toLowerCase();
  const matched = VAGUE_HINTS.find((h) => lower.includes(h));
  if (!matched) return null;
  let proposed = new Date(now);
  if (matched.includes('settimana')) proposed.setDate(proposed.getDate() + 7);
  else if (matched.includes('fine mese')) proposed = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  else if (matched.startsWith('entro ')) {
    const wd = matched.replace('entro ', '');
    const idx = WEEKDAYS.indexOf(wd);
    proposed = idx >= 0 ? nextWeekday(now, idx) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
  } else {
    proposed.setDate(proposed.getDate() + 3);
  }
  proposed.setHours(9, 0, 0, 0);
  return { matchedPhrase: matched, proposedDate: proposed };
}

// Pulizia leggera: spazi, maiuscola iniziale, punteggiatura — non riscrive il significato
function lightGrammarClean(sentence) {
  let s = sentence.replace(/\s+/g, ' ').trim();
  if (!s) return s;
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}

// Costruisce un titolo pulito per un'attività, rimuovendo riempitivi e frammenti di data/ora
function cleanActionTitle(sentence, dateFragments) {
  let s = sentence.toLowerCase();
  dateFragments.forEach((frag) => {
    s = s.replace(frag, '');
  });
  FILLER_PREFIXES.forEach((prefix) => {
    if (s.trim().startsWith(prefix.trim())) {
      s = s.trim().slice(prefix.trim().length);
    }
  });
  s = s.replace(/\bdi\s+$/i, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/[.,;:]+$/, '');
  if (!s) return sentence.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function guessCategory(lower) {
  if (HIGH_PRIORITY_HINTS.some((w) => lower.includes(w))) return 'Urgente';
  if (['lavoro', 'riunione', 'cliente', 'ufficio', 'progetto', 'consegna', 'meeting'].some((w) => lower.includes(w))) return 'Lavoro';
  return 'Personale';
}

function getPriority(lower) {
  if (HIGH_PRIORITY_HINTS.some((w) => lower.includes(w))) return 'alta';
  if (MEDIUM_PRIORITY_HINTS.some((w) => lower.includes(w))) return 'media';
  return 'bassa';
}

function splitSentences(text) {
  return text
    .split(/\n|(?<=[.!?])\s+|,\s+(?=poi|e\s)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function organizeIdeasV3(rawText) {
  const now = new Date();
  const rawSentences = splitSentences(rawText);

  const classified = rawSentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const { date: clearDate, matchedFragments } = extractDateTime(sentence, now);
    const vague = clearDate ? null : detectVagueHint(sentence, now);
    const hasAction = ACTION_VERBS.some((w) => lower.includes(w));
    const isIdea = !hasAction && IDEA_HINTS.some((w) => lower.includes(w));

    let kind = 'informazione';
    if (hasAction || clearDate || vague) kind = 'attivita';
    else if (isIdea) kind = 'idea';
    else if (lower.includes('scadenza') || lower.includes('deadline')) kind = 'scadenza';

    return {
      original: sentence,
      cleaned: lightGrammarClean(sentence),
      kind,
      priority: getPriority(lower),
      category: guessCategory(lower),
      clearDate,
      vague,
      cleanTitle: cleanActionTitle(sentence, matchedFragments)
    };
  });

  const groups = { attivita: [], idea: [], informazione: [], scadenza: [] };
  classified.forEach((c) => groups[c.kind].push(c));

  // Testo organizzato in sezioni con titoli — non cancella il testo originale, lo riorganizza
  let organizedText = '';
  if (groups.attivita.length) {
    organizedText += 'Attività:\n' + groups.attivita.map((c) => `• ${c.cleanTitle}`).join('\n') + '\n\n';
  }
  if (groups.scadenza.length) {
    organizedText += 'Scadenze:\n' + groups.scadenza.map((c) => `• ${c.cleaned}`).join('\n') + '\n\n';
  }
  if (groups.idea.length) {
    organizedText += 'Idee:\n' + groups.idea.map((c) => `• ${c.cleaned}`).join('\n') + '\n\n';
  }
  if (groups.informazione.length) {
    organizedText += 'Informazioni:\n' + groups.informazione.map((c) => `• ${c.cleaned}`).join('\n');
  }
  organizedText = organizedText.trim();

  const autoTasks = groups.attivita
    .filter((c) => c.clearDate)
    .map((c) => ({
      title: c.cleanTitle,
      date: c.clearDate.toISOString(),
      priority: c.priority,
      category: c.category,
      mode: 'auto'
    }));

  const suggestedTasks = classified
    .filter((c) => c.vague)
    .map((c) => ({
      title: c.cleanTitle,
      date: c.vague.proposedDate.toISOString(),
      matchedPhrase: c.vague.matchedPhrase,
      priority: c.priority,
      category: c.category,
      mode: 'suggested'
    }));

  return {
    organizedText,
    originalText: rawText,
    autoTasks,
    suggestedTasks,
    hasChanges: organizedText.length > 0 && organizedText !== rawText.trim()
  };
}

// Rileva se una nota descrive un possibile progetto/idea creativa (non un semplice promemoria)
export function detectProject(text) {
  const lower = text.toLowerCase();
  const hits = PROJECT_HINTS.filter((w) => lower.includes(w));
  // Richiede almeno un indizio "progettuale" e una lunghezza minima di contenuto descrittivo
  return hits.length > 0 && text.trim().length > 25;
}

// Suggerisce l'attività più importante "adesso" per la dashboard
export function suggestNextAction(events, notes) {
  const now = Date.now();
  const upcoming = events
    .filter((e) => e.date && e.status !== 'completato' && new Date(e.date).getTime() >= now - 60 * 60 * 1000)
    .map((e) => {
      const minutesAway = (new Date(e.date).getTime() - now) / 60000;
      const priorityScore = e.category === 'Urgente' ? 3 : e.category === 'Lavoro' ? 2 : 1;
      const urgencyScore = Math.max(0, 1000 - minutesAway) / 1000;
      return { ...e, score: priorityScore + urgencyScore };
    })
    .sort((a, b) => b.score - a.score);

  if (upcoming.length > 0) {
    const top = upcoming[0];
    const minutesAway = Math.round((new Date(top.date).getTime() - now) / 60000);
    return {
      type: 'event',
      title: top.title,
      hint: minutesAway <= 0 ? 'in corso ora' : minutesAway < 60 ? `tra ${minutesAway} min` : `tra ${Math.round(minutesAway / 60)}h`
    };
  }

  const recentNote = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (recentNote) return { type: 'note', title: recentNote.title || 'Nota senza titolo', hint: 'da rivedere' };

  return null;
}
