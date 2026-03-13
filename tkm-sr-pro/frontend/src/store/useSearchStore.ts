import { create } from 'zustand';

interface SearchState {
  query: string;
  selectedDBs: string[];
  setQuery: (q: string) => void;
  toggleDB: (db: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  selectedDBs: ['PubMed', 'KMbase', 'RISS', 'Cochrane'],
  setQuery: (q: string) => set({ query: q }),
  toggleDB: (db: string) => set((state: SearchState) => ({
    selectedDBs: state.selectedDBs.includes(db)
      ? state.selectedDBs.filter((d: string) => d !== db)
      : [...state.selectedDBs, db]
  })),
}));
