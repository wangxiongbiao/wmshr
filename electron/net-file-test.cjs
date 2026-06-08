const { app, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
app.whenReady().then(async () => {
  const filePath = path.join(process.cwd(), 'apps/mobile/dist-web/_expo/static/js/web/index-95d559b189a2c6d25fea20b631725923.js');
  const res = await net.fetch(pathToFileURL(filePath).toString());
  console.log(JSON.stringify({status: res.status, contentType: res.headers.get('content-type'), len: (await res.text()).length}));
  app.quit();
});
