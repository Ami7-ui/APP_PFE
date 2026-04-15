import { create } from 'zustand';

const useSqlStore = create((set) => ({
  extractedScripts: [],
  setExtractedScripts: (scripts) => set({ extractedScripts: scripts }),
  addScripts: (newScripts) => set((state) => {
    const uniqueNewScripts = newScripts.filter(newS => 
      !state.extractedScripts.some(oldS => oldS.nom === newS.nom && oldS.type === newS.type)
    );
    return { extractedScripts: [...state.extractedScripts, ...uniqueNewScripts] };
  }),
}));

export default useSqlStore;
