const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });

  const testCases = [
    { name: 'iPhone 13 (Portrait)', width: 390, height: 844, isMobile: true, expectBlocked: true },
    { name: 'Samsung Galaxy (Portrait)', width: 412, height: 915, isMobile: true, expectBlocked: true },
    { name: 'iPhone 13 (Landscape)', width: 844, height: 390, isMobile: true, expectBlocked: true },
    { name: 'iPad Mini (Tablet)', width: 768, height: 1024, isMobile: true, expectBlocked: false },
    { name: 'iPad Air (Tablet)', width: 820, height: 1180, isMobile: true, expectBlocked: false },
    { name: 'Desktop Full HD', width: 1920, height: 1080, isMobile: false, expectBlocked: false }
  ];

  let allPassed = true;
  console.log('========================================================================');
  console.log('  HZSITD — RESPONSIVE DEVICE ACCESS AUDIT (Tablets + Desktop vs Phone)  ');
  console.log('========================================================================\n');

  for (const tc of testCases) {
    const page = await browser.newPage();
    await page.setViewport({ width: tc.width, height: tc.height, isMobile: tc.isMobile });
    await page.goto('http://localhost:3000/html/index.html', { waitUntil: 'domcontentloaded' });
    
    // Give 1.5s for initial DOM & CSS evaluation
    await new Promise(r => setTimeout(r, 1500));

    const result = await page.evaluate(() => {
      const blocker = document.getElementById('mobile-blocker');
      const intro = document.getElementById('intro-overlay');
      const header = document.querySelector('.header');
      const hero = document.getElementById('hero-banner');
      const style = blocker ? window.getComputedStyle(blocker) : null;
      const blockerDisplay = style ? style.display : 'none';
      const blockerVisible = blocker ? (blocker.offsetWidth > 0 && blocker.offsetHeight > 0) : false;
      const isMobileClass = document.documentElement.classList.contains('is-mobile-phone');

      return {
        blockerDisplay,
        blockerVisible,
        isMobileClass,
        hasHeader: !!header,
        hasHero: !!hero
      };
    });

    const isActuallyBlocked = result.blockerDisplay === 'flex' && result.blockerVisible;
    const passed = (isActuallyBlocked === tc.expectBlocked);
    if (!passed) allPassed = false;

    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${tc.name} (${tc.width}x${tc.height}):`);
    console.log(`       Expect Blocked: ${tc.expectBlocked} | Actual Blocked: ${isActuallyBlocked}`);
    console.log(`       Blocker Display: ${result.blockerDisplay} | is-mobile-phone class: ${result.isMobileClass}\n`);

    if (tc.name === 'iPhone 13 (Portrait)') {
      await page.screenshot({ path: 'frontend/scripts/verified-phone-blocker.png' });
    } else if (tc.name === 'iPad Mini (Tablet)') {
      await page.screenshot({ path: 'frontend/scripts/verified-tablet-allowed.png' });
    }

    await page.close();
  }

  // Test Subpage redirection on Mobile
  console.log('--- Testing Subpage Redirection on Mobile (iPhone 13) ---');
  const subPage = await browser.newPage();
  await subPage.setViewport({ width: 390, height: 844, isMobile: true });
  await subPage.goto('http://localhost:3000/html/about-us.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const subUrl = subPage.url();
  const subPassed = subUrl.includes('index.html');
  if (!subPassed) allPassed = false;
  console.log(`[${subPassed ? 'PASS' : 'FAIL'}] Direct visit to /html/about-us.html on phone -> Redirected to: ${subUrl}\n`);
  await subPage.close();

  // Test Subpage on Tablet (should NOT redirect)
  console.log('--- Testing Subpage Access on Tablet (iPad Mini) ---');
  const tabSubPage = await browser.newPage();
  await tabSubPage.setViewport({ width: 768, height: 1024, isMobile: true });
  await tabSubPage.goto('http://localhost:3000/html/about-us.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const tabSubUrl = tabSubPage.url();
  const tabSubPassed = tabSubUrl.includes('about-us.html');
  if (!tabSubPassed) allPassed = false;
  console.log(`[${tabSubPassed ? 'PASS' : 'FAIL'}] Direct visit to /html/about-us.html on tablet -> Kept at: ${tabSubUrl}\n`);
  await tabSubPage.close();

  await browser.close();

  console.log('========================================================================');
  console.log(`FINAL RESULT: ${allPassed ? 'ALL AUDIT CHECKS PASSED PERFECTLY' : 'SOME CHECKS FAILED'}`);
  console.log('========================================================================');
  process.exit(allPassed ? 0 : 1);
})();
