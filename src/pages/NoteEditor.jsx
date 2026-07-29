import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { detectProject } from '../utils/ideaOrganizer';
import { organizeNoteSmart } from '../utils/aiClient';
import { pushNoteVersion, restoreNoteVersion } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { IconSparkle, IconImage, IconClose } from '../components/Icons';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export default function NoteEditor({ note, onSave, onDelete, onClose, onAddAutoTasks, onAddSuggestedTask }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [checklist, setChecklist] = useState(note?.checklist || []);
  const [links, setLinks] = useState(note?.links || []);
  const [images, setImages] = useState(note?.images || []);
  const [attachments, setAttachments] = useState(note?.attachments || []);
  const [history, setHistory] = useState(note?.history || []);
  const [newLink, setNewLink] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [aiPreview, setAiPreview] = useState(null);
  const [suggestedDrafts, setSuggestedDrafts] = useState([]);
  const [imageBetaResult, setImageBetaResult] = useState(note?.generatedImage || null);
  const [projectPromptDismissed, setProjectPromptDismissed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState('salvato');
  const [organizing, setOrganizing] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const saveTimer = useRef(null);
  const lastSavedRef = useRef({ title, content });
  const fileInputRef = useRef(null);
  const attachInputRef = useRef(null);
  // L'id viene deciso UNA SOLA VOLTA all'apertura dell'editor e non cambia mai
  // più durante la sessione, altrimenti ogni salvataggio automatico creerebbe
  // una nota duplicata invece di aggiornare quella esistente.
  const noteIdRef = useRef(note?.id || uid());

  const isProject = detectProject(content || title);

  const buildNote = (extra = {}) => ({
    id: noteIdRef.current,
    title,
    content,
    checklist,
    links,
    images,
    attachments,
    generatedImage: imageBetaResult,
    history,
    lastEditedBy: user,
    createdAt: note?.createdAt || Date.now(),
    updatedAt: Date.now(),
    ...extra
  });

  const doSave = (recordVersion) => {
    setSaveStatus('in corso');
    try {
      const current = buildNote();
      let finalHistory = history;
      if (recordVersion) {
        const changed = lastSavedRef.current.title !== title || lastSavedRef.current.content !== content;
        if (changed) {
          finalHistory = pushNoteVersion({ ...current, history }, user);
          setHistory(finalHistory);
          lastSavedRef.current = { title, content };
        }
      }
      onSave({ ...current, history: finalHistory });
      setSaveError(false);
      setTimeout(() => setSaveStatus('salvato'), 250);
    } catch (e) {
      console.error(e);
      setSaveError(true);
      setSaveStatus('salvato');
    }
  };

  useEffect(() => {
    const interval = setInterval(() => doSave(true), 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, checklist, links, images, attachments, imageBetaResult]);

  useEffect(() => {
    setSaveStatus('in corso');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(true), 900);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist([...checklist, { id: uid(), text: newCheckItem.trim(), done: false }]);
    setNewCheckItem('');
  };

  const toggleCheckItem = (id) => setChecklist(checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  const removeCheckItem = (id) => setChecklist(checklist.filter((c) => c.id !== id));

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    setLinks([...links, newLink.trim()]);
    setNewLink('');
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, { id: uid(), name: file.name, dataUrl: reader.result }]);
      reader.readAsDataURL(file);
    });
  };

  const handleAttachUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setAttachments((prev) => [...prev, { id: uid(), name: file.name, size: file.size, dataUrl: reader.result }]);
      reader.readAsDataURL(file);
    });
  };

  const handleOrganizeIdeas = async () => {
    setOrganizing(true);
    try {
      const result = await organizeNoteSmart(content || title);
      setAiPreview(result);
      setSuggestedDrafts(result.suggestedTasks.map((t) => ({ ...t, decided: false })));
    } catch (e) {
      showToast('Si è verificato un problema. Riprova tra poco.', 'error');
    } finally {
      setOrganizing(false);
    }
  };

  const applyAiChanges = () => {
    if (!aiPreview) return;
    setContent(aiPreview.organizedText || content);
    if (aiPreview.autoTasks.length) {
      onAddAutoTasks(aiPreview.autoTasks);
      showToast('Attività aggiunta al calendario ✓');
    }
    showToast('Nota organizzata correttamente ✓');
    setAiPreview(null);
  };

  const cancelAiChanges = () => setAiPreview(null);

  const decideSuggestion = (index, action, manualDate) => {
    const draft = suggestedDrafts[index];
    if (!draft) return;
    if (action === 'create') {
      onAddSuggestedTask({ ...draft, date: manualDate || draft.date });
      showToast('Attività aggiunta al calendario ✓');
    }
    setSuggestedDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, decided: true } : d)));
  };

  const handleGenerateImageBeta = () => {
    const palette = ['#C65A3A', '#E07A4E', '#E8D6C3', '#A9472B'];
    const seed = (title + content).length;
    setImageBetaResult({
      placeholder: true,
      visualPrompt: `Concept visivo per: "${title || 'progetto senza titolo'}" — stile minimale, palette calda`,
      color: palette[seed % palette.length],
      label: title || 'Progetto senza titolo'
    });
    setProjectPromptDismissed(true);
  };

  const restoreVersion = (index) => {
    const restored = restoreNoteVersion({ title, content, checklist, links, history }, index);
    setTitle(restored.title);
    setContent(restored.content);
    setChecklist(restored.checklist);
    setLinks(restored.links);
    setShowHistory(false);
  };

  const exportTXT = () => {
    const lines = [title, '', content, '', ...checklist.map((c) => `${c.done ? '[x]' : '[ ]'} ${c.text}`), ...links];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'nota'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      const marginX = 15;
      const pageHeight = 297;
      const contentWidth = 210 - marginX * 2;
      let y = 20;

      const ensureSpace = (needed) => {
        if (y + needed > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }
      };

      doc.setFontSize(16);
      doc.text(title || 'Nota', marginX, y);
      y += 10;

      doc.setFontSize(11);
      // "•" può non essere renderizzato dal font di default del PDF: uso "-" per sicurezza
      const cleanedContent = (content || '').replace(/•/g, '-');
      const contentLines = doc.splitTextToSize(cleanedContent, contentWidth);
      contentLines.forEach((line) => {
        ensureSpace(7);
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 4;

      if (checklist.length) {
        ensureSpace(9);
        doc.setFont(undefined, 'bold');
        doc.text('Checklist:', marginX, y);
        doc.setFont(undefined, 'normal');
        y += 7;
        checklist.forEach((c) => {
          ensureSpace(7);
          doc.text(`${c.done ? '[x]' : '[ ]'} ${c.text}`, marginX, y);
          y += 7;
        });
        y += 3;
      }

      if (links.length) {
        ensureSpace(9);
        doc.setFont(undefined, 'bold');
        doc.text('Link:', marginX, y);
        doc.setFont(undefined, 'normal');
        y += 7;
        links.forEach((l) => {
          const linkLines = doc.splitTextToSize(l, contentWidth);
          linkLines.forEach((line) => {
            ensureSpace(6);
            doc.text(line, marginX, y);
            y += 6;
          });
        });
        y += 3;
      }

      if (images.length) {
        ensureSpace(10);
        doc.setFont(undefined, 'bold');
        doc.text('Immagini:', marginX, y);
        doc.setFont(undefined, 'normal');
        y += 8;

        for (const img of images) {
          try {
            const dims = await getImageDimensions(img.dataUrl);
            const mmPerPx = 0.264583; // conversione px → mm a 96dpi
            let w = dims.width * mmPerPx;
            let h = dims.height * mmPerPx;
            const maxHeight = 90;
            const scale = Math.min(contentWidth / w, maxHeight / h, 1);
            w *= scale;
            h *= scale;
            ensureSpace(h + 10);
            const format = img.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(img.dataUrl, format, marginX, y, w, h);
            y += h + 8;
          } catch (e) {
            console.warn('Immagine non inseribile nel PDF', e);
          }
        }
      }

      doc.save(`${title || 'nota'}.pdf`);
      showToast('PDF esportato ✓');
    } catch (e) {
      console.error(e);
      showToast('Si è verificato un problema con l\'esportazione. Riprova tra poco.', 'error');
    }
  };

  const showProjectPrompt = isProject && !imageBetaResult && !projectPromptDismissed && content.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-bg dark:bg-dark-bg flex flex-col page-transition">
      <header
        className="flex items-center justify-between px-4 border-b border-textSoft/10 dark:border-dark-text/10"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))', paddingBottom: '12px' }}
      >
        <button onClick={() => { doSave(true); onClose(); }} className="text-primary dark:text-dark-primary font-semibold min-h-[44px] shrink-0">
          Note
        </button>
        <span className="text-[11px] text-textSoft dark:text-dark-text/50 truncate px-2 text-center flex-1 min-w-0">
          {saveError ? 'Problema di salvataggio' : saveStatus === 'in corso' ? 'Salvataggio in corso…' : 'Salvato ✓'}
        </span>
        <button onClick={onDelete} className="text-sm text-primary dark:text-dark-primary font-medium min-h-[44px] shrink-0">
          Elimina
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl w-full mx-auto">
        <input
          className="w-full text-xl font-bold bg-transparent focus:outline-none"
          placeholder="Titolo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full min-h-[140px] bg-transparent focus:outline-none resize-none text-textMain dark:text-dark-text"
          placeholder="Scrivi le tue idee qui..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="text-xs text-textSoft dark:text-dark-text/50 flex justify-between">
          <span>Creata: {new Date(note?.createdAt || Date.now()).toLocaleString('it-IT')}</span>
          <button onClick={() => setShowHistory(true)} className="underline">Cronologia ({history.length})</button>
        </div>
        {note?.lastEditedBy && (
          <p className="text-xs text-textSoft dark:text-dark-text/50 -mt-3">Ultima modifica di {note.lastEditedBy}</p>
        )}

        <button onClick={handleOrganizeIdeas} disabled={organizing} className="btn-primary w-full min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-70">
          <IconSparkle className="w-5 h-5" /> {organizing ? 'Sto organizzando la nota…' : 'Sistema la mia nota'}
        </button>

        {aiPreview && (
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Anteprima modifica IA</p>
              <span className="text-[10px] uppercase tracking-wide text-textSoft dark:text-dark-text/40">
                {aiPreview.source === 'ai' ? 'Generata da Groq' : 'Motore locale (offline)'}
              </span>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-bg dark:bg-dark-bg rounded-2xl p-3">
              {aiPreview.organizedText || 'Nessuna modifica proposta: il testo è già chiaro.'}
            </pre>

            {aiPreview.autoTasks.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">Attività rilevate:</p>
                <ul className="text-sm space-y-1.5">
                  {aiPreview.autoTasks.map((t, i) => (
                    <li key={i} className="bg-bg dark:bg-dark-bg rounded-xl p-2">
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-textSoft dark:text-dark-text/50">
                        {new Date(t.date).toLocaleDateString('it-IT')} · {new Date(t.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · {t.category}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestedDrafts.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">Impegni con data incerta (conferma tu):</p>
                <div className="space-y-2">
                  {suggestedDrafts.map((d, i) => !d.decided && (
                    <SuggestedTaskRow key={i} draft={d} onDecide={(action, manualDate) => decideSuggestion(i, action, manualDate)} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={cancelAiChanges} className="btn-ghost flex-1 text-sm min-h-[44px]">Annulla</button>
              <button onClick={applyAiChanges} className="btn-primary flex-1 text-sm min-h-[44px]">Applica modifiche</button>
            </div>
          </div>
        )}

        {showProjectPrompt && (
          <div className="card p-4 space-y-3">
            <p className="text-sm">
              Ho rilevato un possibile progetto. Vuoi creare un'immagine rappresentativa?
            </p>
            <p className="text-xs text-textSoft dark:text-dark-text/50">BETA - funzione in miglioramento</p>
            <div className="flex gap-2">
              <button onClick={() => setProjectPromptDismissed(true)} className="btn-ghost flex-1 text-sm min-h-[44px]">Ignora</button>
              <button onClick={handleGenerateImageBeta} className="btn-primary flex-1 text-sm min-h-[44px] flex items-center justify-center gap-2">
                <IconImage className="w-4 h-4" /> Genera immagine
              </button>
            </div>
          </div>
        )}

        {imageBetaResult && (
          <div>
            <div className="rounded-2xl h-40 flex items-center justify-center text-white font-semibold text-center px-4" style={{ background: imageBetaResult.color }}>
              {imageBetaResult.label} (anteprima simulata)
            </div>
            <p className="text-xs text-textSoft dark:text-dark-text/50 mt-1 italic">{imageBetaResult.visualPrompt}</p>
            <p className="text-xs text-textSoft dark:text-dark-text/50">BETA - funzione in miglioramento</p>
          </div>
        )}

        <div className="card p-4">
          <p className="font-semibold mb-2">Checklist</p>
          <ul className="space-y-2 mb-3">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <input type="checkbox" checked={c.done} onChange={() => toggleCheckItem(c.id)} className="accent-primary w-5 h-5" />
                <span className={`flex-1 text-sm ${c.done ? 'line-through text-textSoft dark:text-dark-text/40' : ''}`}>{c.text}</span>
                <button onClick={() => removeCheckItem(c.id)} className="text-textSoft dark:text-dark-text/40 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <IconClose className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="Nuovo elemento"
              value={newCheckItem}
              onChange={(e) => setNewCheckItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCheckItem()}
            />
            <button onClick={handleAddCheckItem} className="btn-primary px-4 min-h-[44px] min-w-[44px]">+</button>
          </div>
        </div>

        <div className="card p-4">
          <p className="font-semibold mb-2">Link</p>
          <ul className="space-y-1 mb-3 text-sm">
            {links.map((l, i) => (
              <li key={i} className="flex items-center justify-between">
                <a href={l} target="_blank" rel="noreferrer" className="text-primary dark:text-dark-primary truncate underline">{l}</a>
                <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} className="text-textSoft dark:text-dark-text/40 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <IconClose className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="https://..."
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            />
            <button onClick={handleAddLink} className="btn-primary px-4 min-h-[44px] min-w-[44px]">+</button>
          </div>
        </div>

        <div className="card p-4">
          <p className="font-semibold mb-2">Immagini</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <img src={img.dataUrl} alt={img.name} className="rounded-2xl h-20 w-full object-cover" />
                <button
                  onClick={() => setImages(images.filter((i) => i.id !== img.id))}
                  className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center"
                ><IconClose className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="btn-ghost w-full text-sm min-h-[44px]">Aggiungi immagine</button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
        </div>

        <div className="card p-4 mb-6">
          <p className="font-semibold mb-2">Allegati</p>
          <ul className="space-y-1 mb-3 text-sm">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="truncate">{a.name}</span>
                <button onClick={() => setAttachments(attachments.filter((x) => x.id !== a.id))} className="text-textSoft dark:text-dark-text/40 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <IconClose className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => attachInputRef.current?.click()} className="btn-ghost w-full text-sm min-h-[44px]">Aggiungi allegato</button>
          <input ref={attachInputRef} type="file" multiple hidden onChange={handleAttachUpload} />
        </div>

        <div className="flex gap-3 pb-6">
          <button onClick={exportTXT} className="btn-ghost flex-1 text-sm min-h-[44px]">Esporta TXT</button>
          <button onClick={exportPDF} className="btn-ghost flex-1 text-sm min-h-[44px]">Esporta PDF</button>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          <div className="card w-full max-w-sm p-5 max-h-[70vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-3">Cronologia versioni</h3>
            {history.length === 0 && <p className="text-sm text-textSoft dark:text-dark-text/60">Nessuna versione precedente salvata.</p>}
            <ul className="space-y-3">
              {history.map((v, i) => (
                <li key={i} className="border-b border-textSoft/10 dark:border-dark-text/10 pb-2">
                  <p className="text-sm font-medium truncate">{v.title || 'Senza titolo'}</p>
                  <p className="text-xs text-textSoft dark:text-dark-text/50">
                    {new Date(v.savedAt).toLocaleString('it-IT')} · modificato da {v.editedBy}
                  </p>
                  <button onClick={() => restoreVersion(i)} className="text-xs text-primary dark:text-dark-primary underline mt-1">
                    Ripristina questa versione
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => setShowHistory(false)} className="btn-ghost w-full mt-4 min-h-[44px]">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestedTaskRow({ draft, onDecide }) {
  const [manualDate, setManualDate] = useState(new Date(draft.date).toISOString().slice(0, 16));
  const [editing, setEditing] = useState(false);

  return (
    <div className="bg-bg dark:bg-dark-bg rounded-2xl p-3 text-sm">
      <p className="font-medium">{draft.title}</p>
      <p className="text-xs text-textSoft dark:text-dark-text/50 mb-2">
        Rilevato: "{draft.matchedPhrase}" → proposto {new Date(draft.date).toLocaleString('it-IT')}
      </p>
      {editing && (
        <input type="datetime-local" className="input-field mb-2 text-sm" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
      )}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => onDecide('create', editing ? new Date(manualDate).toISOString() : draft.date)} className="btn-primary text-xs px-3 py-2 min-h-[44px]">Crea promemoria</button>
        <button onClick={() => setEditing((e) => !e)} className="btn-ghost text-xs px-3 py-2 min-h-[44px]">{editing ? 'Usa data proposta' : 'Scegli data'}</button>
        <button onClick={() => onDecide('ignore')} className="text-xs text-textSoft dark:text-dark-text/50 px-2 min-h-[44px]">Ignora</button>
      </div>
    </div>
  );
}
