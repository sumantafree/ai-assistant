/**
 * Global state store using Zustand.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem("access_token", token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null, isAuthenticated: false });
        window.location.href = "/login";
      },
    }),
    { name: "auth-store" }
  )
);

// Voice state
interface VoiceState {
  isListening: boolean;
  transcript: string;
  history: Array<{ command: string; response: string; time: string }>;
  setListening: (v: boolean) => void;
  setTranscript: (v: string) => void;
  addToHistory: (entry: { command: string; response: string; time: string }) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isListening: false,
  transcript: "",
  history: [],
  setListening: (v) => set({ isListening: v }),
  setTranscript: (v) => set({ transcript: v }),
  addToHistory: (entry) =>
    set((s) => ({ history: [entry, ...s.history].slice(0, 50) })),
}));
