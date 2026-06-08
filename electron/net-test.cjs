const { app, net } = require('electron');
app.whenReady().then(async () => {
  try {
    const res = await net.fetch('https://admin.dutylix.com/api/mobile/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: 'x', password: 'y' }),
    });
    const text = await res.text();
    console.log(JSON.stringify({ ok: res.ok, status: res.status, text }));
  } catch (error) {
    console.error('NET_FETCH_ERROR', error && (error.stack || error.message || String(error)));
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
