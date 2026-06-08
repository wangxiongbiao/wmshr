const {contextBridge, ipcRenderer} = require('electron');
const runtimeConfig = require('./runtime-config.json');

contextBridge.exposeInMainWorld('__WMSHR_RUNTIME_CONFIG__', runtimeConfig);
contextBridge.exposeInMainWorld('__WMSHR_DESKTOP_API__', {
  request(request) {
    return ipcRenderer.invoke('wmshr:api-request', request);
  },
});
