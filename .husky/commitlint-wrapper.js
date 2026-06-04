const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf-8');
const firstLine = content.split('\n')[0];
if (firstLine.length > 100) {
  console.log('✖ header must not be longer than 100 characters, current length is ' + firstLine.length + ' [header-max-length]');
  console.log('✖ found 1 problems, 0 warnings');
  process.exit(1);
}
process.exit(0);
