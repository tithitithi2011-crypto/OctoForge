import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

interface ButtonFlashContextValue {
  flashedButtonId: string | null;
  triggerFlash: (id: string) => void;
}

const ButtonFlashContext = createContext<ButtonFlashContextValue>({
  flashedButtonId: null,
  triggerFlash: () => {},
});

const FLASH_DURATION_MS = 2500;

export const ButtonFlashProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flashedButtonId, setFlashedButtonId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const triggerFlash = useCallback((id: string) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setFlashedButtonId(id);
    timerRef.current = window.setTimeout(() => {
      setFlashedButtonId((current) => (current === id ? null : current));
      timerRef.current = null;
    }, FLASH_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <ButtonFlashContext.Provider value={{ flashedButtonId, triggerFlash }}>
      {children}
    </ButtonFlashContext.Provider>
  );
};

export function useButtonFlash() {
  return useContext(ButtonFlashContext);
}
