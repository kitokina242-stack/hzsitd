const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Page 1: Dashboard
  const p1 = await browser.newPage();
  await p1.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  const dashDetails = await p1.evaluate(() => {
    const gear = document.querySelector('aside [fill*="gearGrad"]');
    const digits = document.querySelectorAll('aside text');
    const waves = document.querySelectorAll('aside circle');
    const gearSpin = document.querySelector('aside animateTransform[type="rotate"]');
    const ball = document.querySelector('aside [fill*="ballGrad"]');
    return {
      gearPathStart: gear ? gear.getAttribute('d')?.substring(0, 100) : null,
      digitsCount: digits.length,
      wavesCount: waves.length,
      gearSpinFrom: gearSpin ? gearSpin.getAttribute('from') : null,
      ballParent: ball && ball.parentElement ? ball.parentElement.tagName : null
    };
  });
  console.log('Dashboard details:', JSON.stringify(dashDetails, null, 2));

  // Page 2: Homepage Loader
  const p2 = await browser.newPage();
  await p2.goto('http://localhost:8000/html/index.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));
  const loaderDetails = await p2.evaluate(() => {
    const gear = document.getElementById('gearPath');
    const digits = document.getElementById('digits')?.querySelectorAll('text');
    const waves = document.getElementById('waves')?.children;
    const gearSpin = document.getElementById('gearSpin');
    const ball = document.getElementById('ball');
    return {
      gearPathStart: gear ? gear.getAttribute('d')?.substring(0, 100) : null,
      digitsCount: digits ? digits.length : 0,
      wavesCount: waves ? waves.length : 0,
      gearSpinFrom: gearSpin ? gearSpin.getAttribute('from') : null,
      ballParent: ball && ball.parentElement ? ball.parentElement.id || ball.parentElement.tagName : null
    };
  });
  console.log('Loader details:', JSON.stringify(loaderDetails, null, 2));

  await browser.close();
})();
