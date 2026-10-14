const https = require('https');
const fs = require('fs');

const query = `
[out:json][timeout:120];
(
  way["railway"="rail"](-6.0, 95.0, 6.0, 106.0);
  way["railway"="light_rail"](-6.0, 95.0, 6.0, 106.0);
  way["railway"="narrow_gauge"](-6.0, 95.0, 6.0, 106.0);
);
out geom;
`;

console.log('Querying Overpass for Sumatra railway tracks...');
const postData = 'data=' + encodeURIComponent(query);
const req = https.request({
  hostname: 'overpass-api.de',
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'TrackRL-Extraction/1.0'
  },
  timeout: 60000
}, res => {
  console.log('Status code:', res.statusCode);
  let data = '';
  res.on('data', c => { data += c; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Sumatra elements count:', parsed.elements.length);
      fs.writeFileSync('scratch/sumatra-raw.json', JSON.stringify(parsed));
      console.log('Saved to scratch/sumatra-raw.json');
    } catch(e) {
      console.error(e.message, data.slice(0, 300));
    }
  });
});
req.on('error', console.error);
req.write(postData);
req.end();
