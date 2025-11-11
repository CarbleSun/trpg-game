// Intentionally minimal preload to keep a secure default surface.
// You can expose APIs via contextBridge here if needed later.

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveGameState: (slot, gameState) => ipcRenderer.invoke('save-game-state', slot, gameState),
  loadGameState: (slot) => ipcRenderer.invoke('load-game-state', slot),
  deleteGameSlot: (slot) => ipcRenderer.invoke('delete-game-slot', slot),
  getSaveSlotInfo: (slot) => ipcRenderer.invoke('get-save-slot-info', slot),
})
