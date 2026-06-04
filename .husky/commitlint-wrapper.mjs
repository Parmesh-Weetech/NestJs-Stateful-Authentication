import lint from '@commitlint/lint'
import conventional from '@commitlint/config-conventional'
import fs from 'fs'

const file = process.argv[2]
const message = fs.readFileSync(file, 'utf-8')

const result = await lint(message, conventional.rules)

if (!result.valid) {
  result.errors.forEach(e => console.log('✖ ' + e.name + ': ' + e.value))
  console.log('✖ found ' + result.errors.length + ' problems, 0 warnings')
  process.exit(1)
}
process.exit(0)
