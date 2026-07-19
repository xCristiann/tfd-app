const fs = require('fs')
const path = require('path')
const root = process.cwd()

// Fix ALL special chars in ALL tsx/ts files
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  content = content
    // Middle dot variants
    .replace(/Â·/g, '&middot;')
    .replace(/\u00C2\u00B7/g, '&middot;')
    .replace(/·/g, '&middot;')
    // Arrow right → variants  
    .replace(/â†'/g, '&rarr;')
    .replace(/\u00E2\u0086\u0092/g, '&rarr;')
    .replace(/→/g, '&rarr;')
    // Arrow left ← variants
    .replace(/â†/g, '&larr;')
    .replace(/←/g, '&larr;')
    // Em dash — variants
    .replace(/â€"/g, '&mdash;')
    .replace(/—/g, '&mdash;')
    // En dash – variants
    .replace(/â€"/g, '&ndash;')
    .replace(/–/g, '&ndash;')
    // Copyright ©
    .replace(/Â©/g, '&copy;')
    .replace(/©/g, '&copy;')
    // Registered ®
    .replace(/Â®/g, '&reg;')
    .replace(/®/g, '&reg;')
    // Trademark ™
    .replace(/â„¢/g, '&trade;')
    .replace(/™/g, '&trade;')
    // Smart quotes
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    // Ellipsis …
    .replace(/â€¦/g, '...')
    .replace(/…/g, '...')
    // Star ★
    .replace(/â˜…/g, '&#9733;')
    .replace(/★/g, '&#9733;')
    // Check mark ✓
    .replace(/âœ"/g, '&#10003;')
    .replace(/✓/g, '&#10003;')
    // Cross ✕ ✗
    .replace(/âœ•/g, '&times;')
    .replace(/âœ—/g, '&times;')
    .replace(/✕/g, '&times;')
    .replace(/✗/g, '&times;')
    // Non-breaking space
    .replace(/Â /g, ' ')

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8')
    return true
  }
  return false
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir)
  entries.forEach(entry => {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory() && !['node_modules', '.next', '.git', 'public'].includes(entry)) {
      walkDir(full)
    } else if (entry.match(/\.(tsx|ts|jsx|js)$/) && !entry.includes('fix-')) {
      const changed = fixFile(full)
      if (changed) console.log('  [FIXED]', full.replace(root + path.sep, ''))
    }
  })
}

console.log('Scanning ALL files for broken chars...\n')
walkDir(path.join(root, 'app'))
walkDir(path.join(root, 'components'))
console.log('\nDone! All special chars replaced with HTML entities.')
