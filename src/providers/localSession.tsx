import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const LOCAL_SESSION_MODE_KEY = "musicpromo:session-mode";

type LocalSessionMode = "none" | "local_guest";

type LocalSessionContextValue = {
  isHydrated: boolean;
  mode: LocalSessionMode;
  isLocalGuest: boolean;
  startLocalGuest: () => Promise<boolean>;
  clearLocalSession: () => Promise<boolean>;
};

const LocalSessionContext = createContext<LocalSessionContextValue | null>(null);

function normalizeMode(value: string | null): LocalSessionMode {
  return value === "local_guest" ? "local_guest" : "none";
}

export function LocalSessionProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [mode, setMode] = useState<LocalSessionMode>("none");

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCAL_SESSION_MODE_KEY);
        if (!isActive) return;
        setMode(normalizeMode(stored));
      } catch (error) {
        console.warn("Failed to read local session mode:", error);
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const startLocalGuest = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LOCAL_SESSION_MODE_KEY, "local_guest");
      setMode("local_guest");
      return true;
    } catch (error) {
      console.warn("Failed to start local guest session:", error);
      return false;
    }
  }, []);

  const clearLocalSession = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(LOCAL_SESSION_MODE_KEY);
      setMode("none");
      return true;
    } catch (error) {
      console.warn("Failed to clear local session mode:", error);
      return false;
    }
  }, []);

  const value = useMemo<LocalSessionContextValue>(
    () => ({
      isHydrated,
      mode,
      isLocalGuest: mode === "local_guest",
      startLocalGuest,
      clearLocalSession,
    }),
    [isHydrated, mode, startLocalGuest, clearLocalSession]
  );

  return (
    <LocalSessionContext.Provider value={value}>
      {children}
    </LocalSessionContext.Provider>
  );
}

export function useLocalSession() {
  const context = useContext(LocalSessionContext);
  if (!context) {
    throw new Error("useLocalSession must be used within LocalSessionProvider");
  }
  return context;
}
