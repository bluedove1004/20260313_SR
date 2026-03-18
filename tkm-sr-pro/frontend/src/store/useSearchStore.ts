import { create } from 'zustand';

interface SearchState {
  query: string;
  selectedDBs: string[];
  setQuery: (q: string) => void;
  toggleDB: (db: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  selectedDBs: ['pubmed'],
  setQuery: (q: string) => set({ query: q }),
  toggleDB: (db: string) => set((state: SearchState) => {
    const target = db.toLowerCase();
    const isSelected = state.selectedDBs.some(d => d.toLowerCase() === target);
    return {
      selectedDBs: isSelected
        ? state.selectedDBs.filter(d => d.toLowerCase() !== target)
        : [...state.selectedDBs, target]
    };
  }),
}));
