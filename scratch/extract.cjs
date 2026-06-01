const fs = require('fs');
const html = fs.readFileSync('mrt.html', 'utf-8');
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
if (match) {
  const data = JSON.parse(match[1]);
  fs.writeFileSync('mrt-next-data.json', JSON.stringify(data, null, 2));
  console.log('Extracted NEXT_DATA to mrt-next-data.json');
} else {
  console.log('NEXT_DATA not found');
}
