import { create } from 'zustand';

const useAppStore = create((set) => ({
  // --- USER STATE ---
  user: JSON.parse(localStorage.getItem('og_user')) || null,
  setUser: (user) => {
    if (user) localStorage.setItem('og_user', JSON.stringify(user));
    else localStorage.removeItem('og_user');
    set({ user });
  },

  // --- AI ASSISTANT STATE ---
  aiState: {
    sqlToAnalyze: "",
    result: null,
    loading: false,
    pipelineStep: 0,
    selectedBase: "",
  },
  setAiState: (newState) => set((state) => ({ 
    aiState: { ...state.aiState, ...newState } 
  })),
  resetAiState: () => set({ 
    aiState: { sqlToAnalyze: "", result: null, loading: false, pipelineStep: 0, selectedBase: "" } 
  }),

  // --- AUDIT STATE ---
  auditState: {
    selectedBase: "",
    result: null,
    activeTab: 'performance',
    loading: false,
    error: "",
    selectedPlan: null,
    activeSqlId: null,
  },
  setAuditState: (newState) => set((state) => ({ 
    auditState: { ...state.auditState, ...newState } 
  })),

  // --- UI STATE ---
  isSidebarOpen: localStorage.getItem('og_sidebar_open') !== 'false',
  toggleSidebar: () => set((state) => {
    const next = !state.isSidebarOpen;
    localStorage.setItem('og_sidebar_open', String(next));
    return { isSidebarOpen: next };
  }),

  chatbotWidth: parseInt(localStorage.getItem('og_chatbot_width')) || 400,
  setChatbotWidth: (width) => {
    localStorage.setItem('og_chatbot_width', String(width));
    set({ chatbotWidth: width });
  },
}));

export default useAppStore;
