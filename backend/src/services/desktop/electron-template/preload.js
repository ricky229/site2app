const { contextBridge } = require('electron');
const config = require('./app-config.json');

contextBridge.exposeInMainWorld('site2app', {
  appName: config.appName,
  version: '1.0.0'
});
