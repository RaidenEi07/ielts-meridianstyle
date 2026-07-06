"use client";

import { create } from "zustand";

interface EditModeState {
  enabled: boolean;
  toggle: () => void;
}

export const useEditModeStore = create<EditModeState>()((set) => ({
  enabled: false,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
}));
