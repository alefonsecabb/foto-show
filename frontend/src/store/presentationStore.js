import { create } from 'zustand';

export const STEPS = {
  HOME: 'home',
  PICKING: 'picking',
  ANALYZING: 'analyzing',
  SETUP: 'setup',
  PRESENTING: 'presenting',
};

export const usePresentationStore = create((set, get) => ({
  step: STEPS.HOME,
  photos: [],
  analyses: {},
  analysisProgress: { done: 0, total: 0 },
  approvedAnimations: {},
  spotifyToken: null,
  spotifyProfile: null,
  selectedTracks: [],
  currentPhotoIndex: 0,
  isFullscreen: false,

  setStep: (step) => set({ step }),

  setPhotos: (photos) => set({ photos, analyses: {}, approvedAnimations: {} }),

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

  setApprovedAnimation: (filename, approved) =>
    set((s) => ({
      approvedAnimations: { ...s.approvedAnimations, [filename]: approved },
    })),

  setSpotifyToken: (token) => set({ spotifyToken: token }),
  setSpotifyProfile: (profile) => set({ spotifyProfile: profile }),
  setSelectedTracks: (tracks) => set({ selectedTracks: tracks }),

  setCurrentPhotoIndex: (index) => set({ currentPhotoIndex: index }),
  setFullscreen: (val) => set({ isFullscreen: val }),

  getComedyPhotos: () => {
    const { photos, analyses } = get();
    return photos.filter((p) => {
      const a = analyses[p.name];
      return a && a.comedy_potential >= 0.7;
    });
  },

  reset: () =>
    set({
      step: STEPS.HOME,
      photos: [],
      analyses: {},
      analysisProgress: { done: 0, total: 0 },
      approvedAnimations: {},
      spotifyToken: null,
      spotifyProfile: null,
      selectedTracks: [],
      currentPhotoIndex: 0,
    }),
}));
