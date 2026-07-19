const fs = require('fs')
const path = require('path')

const root = process.cwd()

// Search all TSX files for the problematic text
function searchFiles(dir) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat.isDirectory() && !['node_modules', '.next', '.git'].includes(file)) {
      searchFiles(full)
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8')
      if (content.includes('Verified') && content.includes('Independent') && content.includes('Transparent')) {
        console.log('FOUND in:', full)
        // Show the line
        const lines = content.split('\n')
        lines.forEach((line, i) => {
          if (line.includes('Verified') || line.includes('Independent')) {
            console.log('  Line', i+1, ':', line.trim().slice(0, 100))
          }
        })
      }
    }
  })
}

searchFiles(path.join(root, 'app'))
searchFiles(path.join(root, 'components'))
console.log('Search done')
