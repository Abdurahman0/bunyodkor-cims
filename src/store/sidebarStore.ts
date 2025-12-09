import { create } from 'zustand'

interface SidebarState {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

// Check if the screen is desktop-sized on initial load
const isDesktop = window.matchMedia('(min-width: 1024px)').matches

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: isDesktop, // Set initial state based on screen size
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
