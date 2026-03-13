import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectStore {
  currentProjectId: number | null;
  currentProjectName: string;
  setCurrentProject: (id: number, name: string) => void;
  clearCurrentProject: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      currentProjectId: null,
      currentProjectName: '',
      setCurrentProject: (id, name) => set({ currentProjectId: id, currentProjectName: name }),
      clearCurrentProject: () => set({ currentProjectId: null, currentProjectName: '' }),
    }),
    { name: 'tkm-sr-project' }
  )
);
