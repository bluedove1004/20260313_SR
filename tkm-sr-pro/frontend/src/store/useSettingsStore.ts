import { create } from 'zustand';

interface SettingsState {
  openAiApiKey: string;
  setOpenAiApiKey: (key: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // We use sessionStorage so it's lost when tab/browser closes as requested
  openAiApiKey: sessionStorage.getItem('openai_api_key') || '',
  setOpenAiApiKey: (key: string) => {
    sessionStorage.setItem('openai_api_key', key);
    set({ openAiApiKey: key });
  },
}));
