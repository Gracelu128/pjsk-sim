import { create } from "zustand";

export const useGachaUIStore = create((set) => ({
  showResults: false,
  openResults: () => set({ showResults: true }),
  closeResults: () => set({ showResults: false }),
}));
