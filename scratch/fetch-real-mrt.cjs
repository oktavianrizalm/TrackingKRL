const https = require('https');
const fs = require('fs');

const url = 'https://beweb-dev.jakartamrt.co.id/middleware/api/datum?fields[]=id&fields[]=name&fields[]=slug&fields[]=object&filters[field][slug]=stasiun&pagination[limit]=100';

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body).data;
    
    // Map of slug to 3-letter ID
    const nameMap = {
      'stasiun-lebak-bulus': 'LBB',
      'stasiun-fatmawati-indomaret': 'FTM',
      'stasiun-cipete-raya': 'CPR',
      'stasiun-haji-nawi': 'HJN',
      'stasiun-blok-a': 'BLA',
      'stasiun-blok-m-bca': 'BLM',
      'stasiun-asean': 'ASN',
      'stasiun-senayan-mastercard': 'SNY',
      'stasiun-istora-mandiri': 'IST',
      'stasiun-bendungan-hilir': 'BNH',
      'stasiun-setiabudi-astra': 'STB',
      'stasiun-dukuh-atas-bni': 'DKA',
      'bundaran-hi-bank-jakarta': 'BHI'
    };

    const stationsData = data.filter(d => nameMap[d.slug]);
    
    // Arah Bundaran HI (End)
    // Arah Lebak Bulus (Start)
    const schedules = {
      weekday: { HI: [], LB: [] },
      weekend: { HI: [], LB: [] }
    };

    for (const st of stationsData) {
      const id = nameMap[st.slug];
      const sched = st.attributes?.object?.schedule || st.object?.schedule;
      if (!sched) continue;

      const addTimes = (type, dir, timesStr) => {
        if (!timesStr) return;
        const times = timesStr.split(';').map(t => t.trim());
        times.forEach((t, i) => {
          if (!schedules[type][dir][i]) schedules[type][dir][i] = {};
          schedules[type][dir][i][id] = t.substring(0, 5); // "05:12:30" -> "05:12"
        });
      };

      addTimes('weekday', 'HI', sched.weekdaysEnd);
      addTimes('weekday', 'LB', sched.weekdaysStart);
      addTimes('weekend', 'HI', sched.weekendsEnd);
      addTimes('weekend', 'LB', sched.weekendsStart);
    }

    const trains = [];
    
    const pushTrains = (type, dir, list) => {
      let counter = 1;
      for (const t of list) {
        if (Object.keys(t).length > 0) {
          trains.push({
            id: `MRT-${dir === 'HI' ? 'HI' : 'LB'}-${type.charAt(0).toUpperCase()}-${counter.toString().padStart(3, '0')}`,
            line: 'MRT',
            destination: dir === 'HI' ? 'Bundaran HI' : 'Lebak Bulus Grab',
            days: type,
            schedule: t
          });
          counter++;
        }
      }
    };

    pushTrains('weekday', 'HI', schedules.weekday.HI);
    pushTrains('weekday', 'LB', schedules.weekday.LB);
    pushTrains('weekend', 'HI', schedules.weekend.HI);
    pushTrains('weekend', 'LB', schedules.weekend.LB);

    fs.writeFileSync('d:/side/Commuter Tracking/static/mrt-schedule.json', JSON.stringify(trains, null, 2));
    console.log(`Generated ${trains.length} trains from API.`);
  });
}).on('error', console.error);
