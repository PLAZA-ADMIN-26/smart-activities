import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { organizeIdeas } from '../utils/ideaOrganizer';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function NoteEditor({ note, onSave, onDelete, onClose, onAddTasksToCalendar }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [checklist, setChecklist] = useState(note?.checklist || []);
  const [links, setLinks] = useState(note?.links || []);
  const [images, setImages] = useState(note?.images || []);
  const [attachments, setAttachments] = useState(note?.attachments || []);
  const [newLink, setNewLink] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [aiPreview, setAiPreview] = useState(null);
  const [imageBetaResult, setImageBetaResult] = useState(note?.generatedImage || null);
  const saveTimer = useRef(null);
  const fileInputRef = useRef(null);
  const attachInputRef = useRef(null);

  const buildNote = () => ({
    id: note?.id || uid(),
    title,
    content,
    checklist,
    links,
    images,
    attachments,
    generatedImage: imageBetaResult,
    createdAt: note?.createdAt || Date.now(),
    updatedAt: Date.now()
  });

  // Salvataggio automatico: ogni pochi secondi + quando l'utente smette di scrivere
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(buildNote());
    }, 1200);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, checklist, links, images, attachments, imageBetaResult]);

  useEffect(() => {
    const interval = setInterval(() => onSave(buildNote()), 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, checklist, links, images, attachments, imageBetaResult]);

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist([...checklist, { id: uid(), text: newCheckItem.trim(), done: false }]);
    setNewCheckItem('');
  };

  const toggleCheckItem = (id) => {
    setChecklist(checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  };

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

  const handleOrganizeIdeas = () => {
    const { organizedText, tasks } = organizeIdeas(content || title);
    setContent(organizedText || content);
    setAiPreview(tasks.filter((t) => t.date));
  };

  const confirmAddTasks = () => {
    if (aiPreview?.length) onAddTasksToCalendar(aiPreview);
    setAiPreview(null);
  };

  const handleGenerateImageBeta = () => {
    // BETA: simulazione mock, come richiesto — nessuna vera generazione IA qui.
    const palette = ['#C65A3A', '#E07A4E', '#E8D6C3', '#A9472B'];
    const seed = (title + content).length;
    setImageBetaResult({
      placeholder: true,
      color: palette[seed % palette.length],
      label: title || 'Progetto senza titolo'
    });
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

  const exportPDF = () => {
    const doc = new jsPDF();
    const marginX = 15;
    let y = 20;
    doc.setFontSize(16);
    doc.text(title || 'Nota', marginX, y);
    y += 10;
    doc.setFontSize(11);
    const contentLines = doc.splitTextToSize(content || '', 180);
    doc.text(contentLines, marginX, y);
    y += contentLines.length * 6 + 6;
    checklist.forEach((c) => {
      doc.text(`${c.done ? '[x]' : '[ ]'} ${c.text}`, marginX, y);
      y += 7;
    });
    if (links.length) {
      y += 4;
      doc.text('Link:', marginX, y);
      y += 6;
      links.forEach((l) => {
        doc.text(l, marginX, y);
        y += 6;
      });
    }
    doc.save(`${title || 'nota'}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg dark:bg-dark-bg flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-textSoft/10 dark:border-dark-text/10">
        <button onClick={() => { onSave(buildNote()); onClose(); }} className="text-primary dark:text-dark-primary font-semibold">
          ‹ Note
        </button>
        <button onClick={onDelete} className="text-sm text-primary dark:text-dark-primary font-medium">
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

        <button onClick={handleOrganizeIdeas} className="btn-primary w-full">
          ✨ Sistema le mie idee
        </button>

        {aiPreview && (
          <div className="card p-4">
            <p className="font-semibold mb-2">Attività riconosciute:</p>
            {aiPreview.length === 0 && <p className="text-sm text-textSoft dark:text-dark-text/60">Nessuna data/attività trovata.</p>}
            <ul className="text-sm space-y-1 mb-3">
              {aiPreview.map((t, i) => (
                <li key={i}>• {t.title} {t.date ? `— ${new Date(t.date).toLocaleString('it-IT')}` : ''}</li>
              ))}
            </ul>
            {aiPreview.length > 0 && (
              <button onClick={confirmAddTasks} className="btn-primary w-full text-sm">
                Aggiungi al calendario
              </button>
            )}
          </div>
        )}

        <div>
          <button onClick={handleGenerateImageBeta} className="btn-ghost w-full">
            🎨 Genera immagine del progetto (BETA)
          </button>
          <p className="text-xs text-textSoft dark:text-dark-text/50 mt-1 text-center">
            Versione beta, la qualità delle immagini e il riconoscimento dei progetti sono ancora in fase di miglioramento.
          </p>
          {imageBetaResult && (
            <div
              className="mt-3 rounded-xl2 h-40 flex items-center justify-center text-white font-semibold text-center px-4"
              style={{ background: imageBetaResult.color }}
            >
              {imageBetaResult.label} (anteprima simulata)
            </div>
          )}
        </div>

        <div className="card p-4">
          <p className="font-semibold mb-2">Checklist</p>
          <ul className="space-y-2 mb-3">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <input type="checkbox" checked={c.done} onChange={() => toggleCheckItem(c.id)} className="accent-primary w-4 h-4" />
                <span className={`flex-1 text-sm ${c.done ? 'line-through text-textSoft dark:text-dark-text/40' : ''}`}>{c.text}</span>
                <button onClick={() => removeCheckItem(c.id)} className="text-textSoft dark:text-dark-text/40 text-sm">✕</button>
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
            <button onClick={handleAddCheckItem} className="btn-primary px-4">+</button>
          </div>
        </div>

        <div className="card p-4">
          <p className="font-semibold mb-2">Link</p>
          <ul className="space-y-1 mb-3 text-sm">
            {links.map((l, i) => (
              <li key={i} className="flex items-center justify-between">
                <a href={l} target="_blank" rel="noreferrer" className="text-primary dark:text-dark-primary truncate underline">{l}</a>
                <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} className="text-textSoft dark:text-dark-text/40">✕</button>
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
            <button onClick={handleAddLink} className="btn-primary px-4">+</button>
          </div>
        </div>

        <div className="card p-4">
          <p className="font-semibold mb-2">Immagini</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <img src={img.dataUrl} alt={img.name} className="rounded-xl2 h-20 w-full object-cover" />
                <button
                  onClick={() => setImages(images.filter((i) => i.id !== img.id))}
                  className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 text-xs"
                >✕</button>
              </div>
            ))}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="btn-ghost w-full text-sm">+ Aggiungi immagine</button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
        </div>

        <div className="card p-4 mb-6">
          <p className="font-semibold mb-2">Allegati</p>
          <ul className="space-y-1 mb-3 text-sm">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="truncate">{a.name}</span>
                <button onClick={() => setAttachments(attachments.filter((x) => x.id !== a.id))} className="text-textSoft dark:text-dark-text/40">✕</button>
              </li>
            ))}
          </ul>
          <button onClick={() => attachInputRef.current?.click()} className="btn-ghost w-full text-sm">+ Aggiungi allegato</button>
          <input ref={attachInputRef} type="file" multiple hidden onChange={handleAttachUpload} />
        </div>

        <div className="flex gap-3 pb-6">
          <button onClick={exportTXT} className="btn-ghost flex-1 text-sm">Esporta TXT</button>
          <button onClick={exportPDF} className="btn-ghost flex-1 text-sm">Esporta PDF</button>
        </div>
      </div>
    </div>
  );
}
