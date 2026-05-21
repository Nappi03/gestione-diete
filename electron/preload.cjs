const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  platform: process.platform,
  isElectron: true,
  exportPdf: (payload) => ipcRenderer.invoke('desktop-export-pdf', payload),
});
