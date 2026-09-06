import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSave, writeSave } from "./save";
import { EMPTY_SAVE, type PlayerSave } from "./types";

type SaveContextValue = {
  save: PlayerSave;
  loading: boolean;
  error: string | null;
  patchSave: (updater: (current: PlayerSave) => PlayerSave) => Promise<PlayerSave>;
  reload: () => Promise<void>;
};

const SaveContext = createContext<SaveContextValue | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<PlayerSave>(EMPTY_SAVE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getSave();
      setSave(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "存档读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patchSave = useCallback(async (updater: (current: PlayerSave) => PlayerSave) => {
    const next = updater(save);
    setSave(next);
    try {
      const stored = await writeSave({ data: next });
      setSave(stored);
      return stored;
    } catch (err) {
      setError(err instanceof Error ? err.message : "存档写入失败");
      return next;
    }
  }, [save]);

  const value = useMemo(
    () => ({ save, loading, error, patchSave, reload }),
    [save, loading, error, patchSave, reload],
  );

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook 与 Provider 共置一处，拆文件会增加所有调用方改动
export function useSave() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error("useSave must be used within SaveProvider");
  return ctx;
}
