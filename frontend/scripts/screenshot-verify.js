const p = require('puppeteer-core');

(async () => {
  const b = await p.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });

  const pg = await b.newPage();
  await pg.setViewport({ width: 1440, height: 900 });
  await pg.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2500));

  await pg.screenshot({ path: 'scripts/dashboard-with-loader-logo.png' });

  const info = await pg.evaluate(() => {
    const f = document.querySelector('iframe[src="/loader-logo.html"]');
    if (!f) return { found: false };
    const r = f.getBoundingClientRect();
    return { found: true, w: r.width, h: r.height };
  });
  console.log('Iframe:', JSON.stringify(info));

  await b.close();
})();
