export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
      <div className="card w-full max-w-sm p-6">
        <h3 className="text-lg font-bold mb-2">{title || 'Conferma'}</h3>
        <p className="text-textSoft dark:text-dark-text/70 mb-6">
          {message || 'Questa operazione è irreversibile. Vuoi continuare?'}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Annulla</button>
          <button onClick={onConfirm} className="btn-primary flex-1">Conferma</button>
        </div>
      </div>
    </div>
  );
}
