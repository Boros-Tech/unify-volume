const { app, BrowserWindow } = require('electron')
const remoteMain = require('@electron/remote/main');

remoteMain.initialize()

app.whenReady().then(() => {
    createWindow()
})
const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })
    remoteMain.enable(win.webContents)
  
    win.loadFile('app/index.html')
  }