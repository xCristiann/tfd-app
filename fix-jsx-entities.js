const fs = require('fs')
const path = require('path')
const root = process.cwd()

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  content = content
    // Fix &mdash; in JSX — replace with unicode em dash
    .replace(/&mdash;/g, '\u2014')
    // Fix &ndash; in JSX
    .replace(/&ndash;/g, '\u2013')
    // Fix &rarr; in JSX — replace with unicode arrow
    .replace(/&rarr;/g, '\u2192')
    // Fix &larr; in JSX
    .replace(/&larr;/g, '\u2190')
    // Fix &#10003; in JSX — checkmark
    .replace(/&#10003;/g, '\u2713')
    // Fix &#9733; in JSX — star
    .replace(/&#9733;/g, '\u2605')
    // Fix &#9651; in JSX — triangle
    .replace(/&#9651;/g, '\u25B3')
    // Fix &times; in JSX — multiply/close
    .replace(/&times;/g, '\u00D7')
    // Fix &middot; — middle dot (keep as is in JSX text, but fix in style strings)
    // In JSX text nodes, &middot; doesn't work — use unicode
    .replace(/&middot;/g, '\u00B7')
    // Fix &copy;
    .replace(/&copy;/g, '\u00A9')
    // Fix &reg;
    .replace(/&reg;/g, '\u00AE')
    // Fix &amp;
    // Don't replace &amp; as it might be intentional

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8')
    return true
  }
  return false
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir)
  entries.forEach(entry => {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory() && !['node_modules', '.next', '.git', 'public'].includes(entry)) {
      walkDir(full)
    } else if (entry.match(/\.(tsx|ts|jsx|js)$/) && !entry.startsWith('fix-')) {
      const changed = fixFile(full)
      if (changed) console.log('  [FIXED]', full.replace(root + path.sep, ''))
    }
  })
}

console.log('Fixing HTML entities in JSX files...\n')
walkDir(path.join(root, 'app'))
walkDir(path.join(root, 'components'))
console.log('\nDone! All HTML entities replaced with Unicode characters.')
