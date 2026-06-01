const https = require('https');
const fs = require('fs');

const query = `
[out:json];
area["name"="Jakarta"]->.searchArea;
(
  relation["route"="subway"](area.searchArea);
  relation["network"="MRT Jakarta"](area.searchArea);
);
out geom;
`;

const options = {
  hostname: 'overpass-api.de',
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('overpass-result.json', data);
    console.log("Done fetching overpass data");
  });
});

req.on('error', e => console.error(e));
req.write('data=' + encodeURIComponent(query));
req.end();
