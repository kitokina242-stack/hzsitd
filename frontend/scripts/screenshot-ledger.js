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
  await new Promise(r => setTimeout(r, 2000));

  // Scroll down to the Department Official Correspondence Ledger section inside main
  await pg.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = main.scrollHeight;
  });
  await new Promise(r => setTimeout(r, 1000));

  await pg.screenshot({ path: 'scripts/dashboard-ledger-widened.png' });
  console.log('Screenshot saved to scripts/dashboard-ledger-widened.png');

  await b.close();
})();
