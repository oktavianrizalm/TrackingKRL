const fs = require('fs');

async function main() {
  const query = `[out:json];relation["network"="MRT Jakarta"];out geom;`;
  
  try {
    const response = await fetch('https://overpass.kumi.systems/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 MRTTracker/1.0'
      },
      body: 'data=' + encodeURIComponent(query)
    });
    
    if (!response.ok) {
      console.error('HTTP Error:', response.status);
      console.error(await response.text());
      return;
    }
    
    const data = await response.json();
    if (!data.elements || data.elements.length === 0) {
       console.log("Empty result from kumi. Trying osm.ch...");
       const response2 = await fetch('https://overpass.osm.ch/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 MRTTracker/1.0'
          },
          body: 'data=' + encodeURIComponent(query)
       });
       const data2 = await response2.json();
       fs.writeFileSync('overpass-result2.json', JSON.stringify(data2));
       console.log('Saved overpass-result2.json');
    } else {
       fs.writeFileSync('overpass-result2.json', JSON.stringify(data));
       console.log('Saved overpass-result2.json');
    }
  } catch(e) {
    console.error(e);
  }
}

main();
