import { organizeIdeasV3, detectProject as detectProjectLocal } from './ideaOrganizer';

const CATEGORY_SET = ['Lavoro', 'Personale', 'Urgente', 'Altro'];

function normalizeAiResult(aiResult, rawText) {
  const sections = aiResult.sections || {};
  let organizedText = '';
  if (aiResult.suggestedTitle) organizedText += `Titolo:\n${aiResult.suggestedTitle}\n\n`;
  if (sections.attivita?.length) organizedText += 'Attività:\n' + sections.attivita.map((s) => `• ${s}`).join('\n') + '\n\n';
  if (sections.scadenza?.length) organizedText += 'Scadenze:\n' + sections.scadenza.map((s) => `• ${s}`).join('\n') + '\n\n';
  if (sections.idea?.length) organizedText += 'Idee:\n' + sections.idea.map((s) => `• ${s}`).join('\n') + '\n\n';
  if (sections.informazione?.length) organizedText += 'Informazioni:\n' + sections.informazione.map((s) => `• ${s}`).join('\n');
  organizedText = organizedText.trim();

  const tasks = (aiResult.tasks || []).filter((t) => t.date);
  const autoTasks = tasks
    .filter((t) => t.certainty !== 'incerta')
    .map((t) => ({
      title: t.title,
      date: t.date,
      category: CATEGORY_SET.includes(t.category) ? t.category : 'Personale',
      priority: t.category === 'Urgente' ? 'alta' : 'bassa',
      mode: 'auto'
    }));

  const suggestedTasks = tasks
    .filter((t) => t.certainty === 'incerta')
    .map((t) => ({
      title: t.title,
      date: t.date,
      matchedPhrase: 'rilevato dall\'IA',
      category: CATEGORY_SET.includes(t.category) ? t.category : 'Personale',
      priority: t.category === 'Urgente' ? 'alta' : 'bassa',
      mode: 'suggested'
    }));

  return {
    organizedText: organizedText || rawText,
    originalText: rawText,
    autoTasks,
    suggestedTasks,
    hasChanges: organizedText.length > 0,
    source: 'ai'
  };
}

// Prova a organizzare la nota con una vera chiamata a Groq (via funzione serverless).
// Se la chiave API non è configurata, la rete non è disponibile, o la risposta
// non è valida, ricade automaticamente sul motore euristico locale — l'utente
// ottiene comunque un risultato, solo di qualità un po' più semplice.
export async function organizeNoteSmart(rawText) {
  try {
    const response = await fetch('/api/organize-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText })
    });

    if (!response.ok) throw new Error('Richiesta fallita');
    const data = await response.json();

    if (data.needsFallback || !data.result) {
      return { ...organizeIdeasV3(rawText), source: 'local' };
    }

    return normalizeAiResult(data.result, rawText);
  } catch (e) {
    // Nessuna connessione, endpoint non disponibile (es. sviluppo locale senza
    // Vercel), o altro errore: si torna comunque a un risultato utilizzabile.
    return { ...organizeIdeasV3(rawText), source: 'local' };
  }
}

export const detectProject = detectProjectLocal;
