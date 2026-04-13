import { create } from 'zustand';

const useSqlStore = create((set) => ({
  extractedScripts: [],
  setExtractedScripts: (scripts) => set({ extractedScripts: scripts }),
}));

export default useSqlStore;
