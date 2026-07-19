const fs = require('fs')
const path = require('path')

const root = process.cwd()
const filePath = path.join(root, 'app/HomeClient.tsx')

let content = fs.readFileSync(filePath, 'utf8')

// Fix line 53 — replace any variant of the broken middot with HTML entity
// The file has Â· which is UTF-8 middle dot (U+00B7) misread as Latin-1
// We replace all variants
content = content
  // broken encoding variants
  .replace(/Â·/g, '&middot;')
  .replace(/\u00C2\u00B7/g, '&middot;')
  // actual middle dot char — replace with HTML entity so it's safe
  .replace(/\u00B7/g, '&middot;')
  // also fix the literal · character
  .replace(/·/g, '&middot;')

fs.writeFileSync(filePath, content, 'utf8')
console.log('[OK] Fixed HomeClient.tsx — all middot chars replaced with &middot;')

// Verify fix
const fixed = fs.readFileSync(filePath, 'utf8')
const lines = fixed.split('\n')
console.log('\nLine 53 now reads:')
console.log(lines[52])
console.log('\nDone!')
