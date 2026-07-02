import { create } from "zustand";

interface LLMStoreState {
  selectedProvider: string;
  setSelectedProvider: (p: string) => void;
}

export const useLLMStore = create<LLMStoreState>((set) => ({
  selectedProvider: "anthropic",
  setSelectedProvider: (p) => set({ selectedProvider: p }),
}));
