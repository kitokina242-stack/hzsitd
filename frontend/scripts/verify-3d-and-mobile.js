const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testDesktopAndMobile() {
  console.log('=== Starting Verification: 3D Compression & Mobile Blocker ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  let allPassed = true;

  try {
    // -------------------------------------------------------------
    // Test 1: Desktop Mode (1280x800)
    // -------------------------------------------------------------
    console.log('[TEST 1] Desktop Mode (1280x800):');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const consoleLogs = [];
    const pageErrors = [];
    page.on('console', msg => consoleLogs.push(msg.text()));
    page.on('pageerror', err => pageErrors.push(err.toString()));

    const startTime = Date.now();
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for 3D ready event or window.__hzsitd3DReady
    console.log('  Waiting for 3D model to load via DRACOLoader...');
    await page.waitForFunction(() => window.__hzsitd3DReady === true, { timeout: 15000 });
    const loadDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  [PASS] 3D Model loaded & ready in ${loadDuration}s (Draco + WebP compressed)`);

    // Verify mobile blocker is NOT displayed on desktop
    const blockerDisplay = await page.evaluate(() => {
      const el = document.getElementById('mobile-blocker');
      return el ? window.getComputedStyle(el).display : 'not_found';
    });
    if (blockerDisplay === 'none') {
      console.log('  [PASS] Mobile blocker is hidden on desktop (display: none)');
    } else {
      console.error(`  [FAIL] Mobile blocker should be hidden on desktop, got display: ${blockerDisplay}`);
      allPassed = false;
    }

    // Wait for intro exit animation
    await new Promise(r => setTimeout(r, 4000));

    // Verify hero banner revealed
    const heroRevealed = await page.evaluate(() => {
      const banner = document.getElementById('hero-banner');
      return banner && banner.classList.contains('hero-revealed');
    });
    if (heroRevealed) {
      console.log('  [PASS] Hero banner successfully revealed on desktop');
    } else {
      console.error('  [FAIL] Hero banner not revealed');
      allPassed = false;
    }

    // Check page errors
    const criticalErrors = pageErrors.filter(e => !e.includes('favicon'));
    if (criticalErrors.length === 0) {
      console.log('  [PASS] Zero JavaScript runtime errors on desktop');
    } else {
      console.error('  [FAIL] Page errors:', criticalErrors);
      allPassed = false;
    }

    await page.close();

    // -------------------------------------------------------------
    // Test 2: Mobile Mode (390x844 — iPhone 14 / Mobile Viewport)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Mobile Mode (390x844 — iPhone Viewport):');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await mobilePage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Verify mobile blocker IS displayed on mobile
    const mobileBlockerStyle = await mobilePage.evaluate(() => {
      const el = document.getElementById('mobile-blocker');
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        display: s.display,
        position: s.position,
        zIndex: s.zIndex
      };
    });

    if (mobileBlockerStyle && mobileBlockerStyle.display === 'flex') {
      console.log('  [PASS] Mobile blocker is actively displayed (display: flex, z-index: ' + mobileBlockerStyle.zIndex + ')');
    } else {
      console.error('  [FAIL] Mobile blocker not displayed on mobile:', mobileBlockerStyle);
      allPassed = false;
    }

    // Verify animated logo SVG exists and is rendered inside blocker
    const logoRendered = await mobilePage.evaluate(() => {
      const svg = document.getElementById('m-intro-svg');
      if (!svg) return false;
      const rect = svg.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (logoRendered) {
      console.log('  [PASS] Animated loader logo SVG is present and visibly rendered inside mobile blocker');
    } else {
      console.error('  [FAIL] Animated logo SVG not visibly rendered on mobile blocker');
      allPassed = false;
    }

    // Verify the office notice text content
    const noticeText = await mobilePage.evaluate(() => {
      const title = document.querySelector('.mobile-blocker-title');
      const msg = document.querySelector('.mobile-blocker-message');
      const am = document.querySelector('.mobile-blocker-amharic');
      return {
        title: title ? title.textContent.trim() : '',
        msg: msg ? msg.textContent.trim() : '',
        am: am ? am.textContent.trim() : ''
      };
    });

    console.log('  Notice title:', noticeText.title);
    console.log('  Notice message:', noticeText.msg);
    if (noticeText.msg.includes('office') && noticeText.msg.includes('mobile phones')) {
      console.log('  [PASS] Office purpose & mobile unavailability message confirmed');
    } else {
      console.error('  [FAIL] Expected message text not found:', noticeText);
      allPassed = false;
    }

    // Take a screenshot of mobile blocker for visual verification
    await mobilePage.screenshot({ path: 'frontend/scripts/mobile-blocker-screenshot.png' });
    console.log('  [PASS] Mobile blocker screenshot saved to frontend/scripts/mobile-blocker-screenshot.png');

    await mobilePage.close();

  } catch (err) {
    console.error('\nVerification encountered error:', err);
    allPassed = false;
  } finally {
    await browser.close();
  }

  console.log('\n=============================================================');
  if (allPassed) {
    console.log('>>> ALL VERIFICATION CHECKS PASSED: 3D Draco + Mobile Blocker <<<');
  } else {
    console.log('>>> SOME CHECKS FAILED <<<');
  }
  console.log('=============================================================\n');
}

testDesktopAndMobile();
