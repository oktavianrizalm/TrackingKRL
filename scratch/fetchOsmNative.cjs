const fs = require('fs');

async function main() {
  const query = `
    [out:json];
    area["name"="Jakarta"]->.searchArea;
    (
      relation["route"="subway"](area.searchArea);
      relation["network"="MRT Jakarta"](area.searchArea);
    );
    out geom;
  `;
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: 'data=' + encodeURIComponent(query)
    });
    
    if (!response.ok) {
      console.error('HTTP Error:', response.status);
      const text = await response.text();
      console.error(text);
      return;
    }
    
    const data = await response.json();
    fs.writeFileSync('overpass-result.json', JSON.stringify(data));
    console.log('Successfully fetched and saved as overpass-result.json');
  } catch(e) {
    console.error(e);
  }
}

main();
