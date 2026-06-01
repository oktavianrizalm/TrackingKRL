const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto('https://jakartamrt.co.id/jadwal-keberangkatan', { waitUntil: 'networkidle2' });
    
    // Get stations
    await page.waitForSelector('.MuiSelect-select');
    await page.click('.MuiSelect-select');
    await page.waitForSelector('.MuiMenuItem-root');
    
    const stations = await page.evaluate(() => {
        const items = document.querySelectorAll('.MuiMenuItem-root');
        return Array.from(items).map(i => ({
           id: i.getAttribute('data-value'),
           name: i.innerText
        })).filter(s => s.id);
    });
    
    // Close dropdown
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
    
    const scheduleData = {};
    
    for (let i = 0; i < stations.length; i++) {
        const station = stations[i];
        console.log("Processing", station.name);
        
        // Open dropdown
        await page.click('.MuiSelect-select');
        await new Promise(r => setTimeout(r, 500));
        
        // Click the specific station
        const items = await page.$$('.MuiMenuItem-root');
        await items[i+1].click();
        await new Promise(r => setTimeout(r, 500));
        
        // Click "Lihat Jadwal"
        const buttons = await page.$$('button');
        for (const b of buttons) {
            const text = await page.evaluate(el => el.textContent, b);
            if (text && text.includes('Lihat Jadwal')) {
                await b.click();
                break;
            }
        }
        
        // Wait for data to render
        await new Promise(r => setTimeout(r, 2000));
        
        // Extract schedule
        const data = await page.evaluate(() => {
            const result = { 'Bundaran HI': [], 'Lebak Bulus': [] };
            const ps = document.querySelectorAll('p');
            
            for (const p of ps) {
                if (p.textContent.includes('Arah Bundaran HI')) {
                    const container = p.nextElementSibling;
                    if (container) {
                        const times = Array.from(container.querySelectorAll('.css-1rwwrf6')).map(el => el.textContent.trim());
                        result['Bundaran HI'] = times;
                    }
                } else if (p.textContent.includes('Arah Lebak Bulus')) {
                    const container = p.nextElementSibling;
                    if (container) {
                        const times = Array.from(container.querySelectorAll('.css-1rwwrf6')).map(el => el.textContent.trim());
                        result['Lebak Bulus'] = times;
                    }
                }
            }
            return result;
        });
        
        scheduleData[station.id] = data;
    }
    
    fs.writeFileSync('mrt-raw-schedule.json', JSON.stringify(scheduleData, null, 2));
    
    const nameMap = {
      'stasiun-lebak-bulus': { id: 'LBB', name: 'Lebak Bulus Grab' },
      'stasiun-fatmawati-indomaret': { id: 'FTM', name: 'Fatmawati Indomaret' },
      'stasiun-cipete-raya': { id: 'CPR', name: 'Cipete Raya' },
      'stasiun-haji-nawi': { id: 'HJN', name: 'Haji Nawi' },
      'stasiun-blok-a': { id: 'BLA', name: 'Blok A' },
      'stasiun-blok-m-bca': { id: 'BLM', name: 'Blok M BCA' },
      'stasiun-asean': { id: 'ASN', name: 'ASEAN' },
      'stasiun-senayan-mastercard': { id: 'SNY', name: 'Senayan Mastercard' },
      'stasiun-istora-mandiri': { id: 'IST', name: 'Istora Mandiri' },
      'stasiun-bendungan-hilir': { id: 'BNH', name: 'Bendungan Hilir' },
      'stasiun-setiabudi-astra': { id: 'STB', name: 'Setiabudi Astra' },
      'stasiun-dukuh-atas-bni': { id: 'DKA', name: 'Dukuh Atas BNI' },
      'bundaran-hi-bank-jakarta': { id: 'BHI', name: 'Bundaran HI' }
    };

    // Write static/mrt-stations.json
    const updatedStations = stations.map(s => {
      const mapped = nameMap[s.id];
      return {
        id: mapped ? mapped.id : s.id,
        name: mapped ? mapped.name : s.name
      };
    });
    
    // Sort actual stations by name, then add placeholder at top
    updatedStations.sort((a, b) => a.name.localeCompare(b.name));
    const finalStations = [{ id: '', name: 'Pilih Stasiun' }, ...updatedStations];
    fs.writeFileSync('static/mrt-stations.json', JSON.stringify(finalStations, null, 2));
    console.log("Written static/mrt-stations.json");

    // Now post-process into trains
    const finalTrains = [];
    
    // Arah Bundaran HI
    const hiCount = scheduleData['stasiun-lebak-bulus']['Bundaran HI'].length;
    for (let t = 0; t < hiCount; t++) {
        const trainSchedule = {};
        for (const station of stations) {
            const times = scheduleData[station.id]['Bundaran HI'];
            if (times && times[t]) {
                const hm = times[t].split(':').slice(0, 2).join(':');
                const mapped = nameMap[station.id];
                trainSchedule[mapped ? mapped.id : station.id] = hm;
            }
        }
        finalTrains.push({
            id: `MRT-HI-${(t+1).toString().padStart(3, '0')}`,
            line: 'MRT',
            destination: 'Bundaran HI',
            schedule: trainSchedule
        });
    }
    
    // Arah Lebak Bulus
    const lbCount = scheduleData['bundaran-hi-bank-jakarta']['Lebak Bulus']?.length;
    if (lbCount) {
        for (let t = 0; t < lbCount; t++) {
            const trainSchedule = {};
            for (const station of stations) {
                const times = scheduleData[station.id]['Lebak Bulus'];
                if (times && times[t]) {
                    const hm = times[t].split(':').slice(0, 2).join(':');
                    const mapped = nameMap[station.id];
                    trainSchedule[mapped ? mapped.id : station.id] = hm;
                }
            }
            finalTrains.push({
                id: `MRT-LB-${(t+1).toString().padStart(3, '0')}`,
                line: 'MRT',
                destination: 'Lebak Bulus Grab',
                schedule: trainSchedule
            });
        }
    }
    
    fs.writeFileSync('static/mrt-schedule.json', JSON.stringify(finalTrains, null, 2));
    console.log("Extracted", finalTrains.length, "trains to static/mrt-schedule.json");
    
    await browser.close();
  } catch (error) {
    console.error("Scraping failed:", error);
  }
})();
