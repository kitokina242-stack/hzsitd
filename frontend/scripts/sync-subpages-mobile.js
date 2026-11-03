const fs = require('fs');
const path = require('path');

const scriptSnippet = `  <script>
    (function () {
      var w = window.innerWidth;
      var h = window.innerHeight;
      var isLandscapePhone = (h <= 500 && w <= 950 && window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
      var isPortraitPhone = (w < 768);
      var ua = navigator.userAgent || '';
      var isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (w >= 768 && h >= 501);
      var isPhone = !isTablet && (isPortraitPhone || isLandscapePhone || /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua));
      if (isPhone) {
        window.location.replace('index.html');
      }
    })();
  </script>`;

const projectRoot = path.resolve(__dirname, '..', '..');
const dirs = [
  path.join(projectRoot, 'frontend/public/html'),
  path.join(projectRoot, 'HZSITD/html')
];
const skipFiles = ['index.html'];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.endsWith('.html') && !skipFiles.includes(file)) {
      const fullPath = path.join(dir, file);
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('window.location.replace(\'index.html\')') && !content.includes('window.location.replace("index.html")')) {
        content = content.replace('</head>', scriptSnippet + '\n</head>');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      } else {
        console.log('Skipped (already exists): ' + fullPath);
      }
    }
  });
});
console.log('Subpage mobile redirection sync complete.');
