const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '../public/html'),
  path.join(__dirname, '../../HZSITD/html')
];

targets.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Replace Letter Portal link with /login
    if (content.includes('href="/dashboard"') && content.includes('Letter Portal')) {
      content = content.replace(/href="\/dashboard">Letter Portal/g, 'href="/login">Letter Portal');
      modified = true;
    }

    // Replace Staff Login links
    if (content.includes('href="/dashboard"') && content.includes('Staff Login')) {
      content = content.replace(/href="\/dashboard"([^>]*>Staff Login<\/a>)/g, 'href="/login"$1');
      modified = true;
    }

    // Replace Staff Registration links
    if (content.includes('href="sign-up.html"') && content.includes('Staff Registration')) {
      content = content.replace(/href="sign-up\.html"([^>]*>Staff Registration<\/a>)/g, 'href="/register"$1');
      modified = true;
    }

    // In pricing / portal sections, replace empty hrefs for Staff Login and Admin Login
    if (content.includes('Staff Login Required')) {
      content = content.replace(/<a href="" class="btn w-100 justify-content-center">(\s*)<span class="btn-text">Staff Login Required<\/span>/g, '<a href="/login" class="btn w-100 justify-content-center">$1<span class="btn-text">Staff Login Required</span>');
      modified = true;
    }
    if (content.includes('Administrator Login')) {
      content = content.replace(/<a href="" class="btn w-100 justify-content-center">(\s*)<span class="btn-text">Administrator Login<\/span>/g, '<a href="/login" class="btn w-100 justify-content-center">$1<span class="btn-text">Administrator Login</span>');
      modified = true;
    }

    // Any generic header item pointing to /dashboard for Letter Portal
    content = content.replace(/<a href="\/dashboard" class="header-link([^>]*)>(\s*<img[^>]*>)?\s*Letter Portal<\/a>/g, '<a href="/login" class="header-link$1>$2Letter Portal</a>');

    if (modified || content !== fs.readFileSync(fullPath, 'utf8')) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log('Successfully updated links in:', fullPath);
    }
  });
});
