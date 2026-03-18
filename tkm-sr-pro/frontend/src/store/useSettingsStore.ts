import { create } from 'zustand';

interface SettingsState {
  openAiApiKey: string;
  setOpenAiApiKey: (key: string) => void;
  searchLimit: number;
  setSearchLimit: (limit: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openAiApiKey: sessionStorage.getItem('openai_api_key') || '',
  setOpenAiApiKey: (key: string) => {
    sessionStorage.setItem('openai_api_key', key);
    set({ openAiApiKey: key });
  },
  searchLimit: Number(localStorage.getItem('search_limit')) || 200,
  setSearchLimit: (limit: number) => {
    localStorage.setItem('search_limit', String(limit));
    set({ searchLimit: limit });
  },
}));
