import { create } from 'zustand';

export const STEPS = {
  HOME: 'home',
  PICKING: 'picking',
  ANALYZING: 'analyzing',
  SETUP: 'setup',
  PRESENTING: 'presenting',
};

export const usePresentationStore = create((set) => ({
  step: STEPS.HOME,
  photos: [],
  analyses: {},
  analysisProgress: { done: 0, total: 0 },
  spotifyToken: null,
  spotifyProfile: null,
  selectedTracks: [],
  currentPhotoIndex: 0,
  isFullscreen: false,

  setStep: (step) => set({ step }),

  setPhotos: (photos) => set({ photos, analyses: {} }),

  setAnalysis: (filename, analysis) =>
    set((s) => ({
      analyses: { ...s.analyses, [filename]: analysis },
      analysisProgress: {
        done: Object.keys(s.analyses).length + 1,
        total: s.analysisProgress.total,
      },
    })),

  setAnalysisTotal: (total) =>
    set((s) => ({ analysisProgress: { ...s.analysisProgress, total } })),

  setSpotifyToken: (token) => set({ spotifyToken: token }),
  setSpotifyProfile: (profile) => set({ spotifyProfile: profile }),
  setSelectedTracks: (tracks) => set({ selectedTracks: tracks }),

  setCurrentPhotoIndex: (index) => set({ currentPhotoIndex: index }),
  setFullscreen: (val) => set({ isFullscreen: val }),

  reset: () =>
    set({
      step: STEPS.HOME,
      photos: [],
      analyses: {},
      analysisProgress: { done: 0, total: 0 },
      spotifyToken: null,
      spotifyProfile: null,
      selectedTracks: [],
      currentPhotoIndex: 0,
    }),
}));
