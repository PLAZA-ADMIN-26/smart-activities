import { createContext, useContext, useState } from 'react';

const ModalStateContext = createContext(null);

export function ModalStateProvider({ children }) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <ModalStateContext.Provider value={{ modalOpen, setModalOpen }}>
      {children}
    </ModalStateContext.Provider>
  );
}

export function useModalState() {
  const ctx = useContext(ModalStateContext);
  if (!ctx) throw new Error('useModalState deve essere usato dentro ModalStateProvider');
  return ctx;
}
