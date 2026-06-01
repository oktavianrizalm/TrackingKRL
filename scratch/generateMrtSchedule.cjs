const fs = require('fs');

const stationsNorthbound = [
  { id: 'LBB', offset: 0 },
  { id: 'FTM', offset: 3 },
  { id: 'CPR', offset: 6 },
  { id: 'HJN', offset: 8 },
  { id: 'BLA', offset: 10 },
  { id: 'BLM', offset: 12 },
  { id: 'ASN', offset: 14 },
  { id: 'SNY', offset: 16 },
  { id: 'IST', offset: 18 },
  { id: 'BNH', offset: 20 },
  { id: 'STB', offset: 22 },
  { id: 'DKA', offset: 24 },
  { id: 'BHI', offset: 27 }
];

const stationsSouthbound = [
  { id: 'BHI', offset: 0 },
  { id: 'DKA', offset: 3 },
  { id: 'STB', offset: 5 },
  { id: 'BNH', offset: 7 },
  { id: 'IST', offset: 9 },
  { id: 'SNY', offset: 11 },
  { id: 'ASN', offset: 13 },
  { id: 'BLM', offset: 15 },
  { id: 'BLA', offset: 17 },
  { id: 'HJN', offset: 19 },
  { id: 'CPR', offset: 21 },
  { id: 'FTM', offset: 24 },
  { id: 'LBB', offset: 27 }
];

function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const trains = [];
let trainCounterHI = 1;
let trainCounterLB = 1;

// Generate trains from 05:00 to 23:55
for (let hour = 5; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 5) {
    const startMinutes = hour * 60 + minute;
    
    // Northbound (Arah Bundaran HI)
    const scheduleHI = {};
    for (const st of stationsNorthbound) {
      scheduleHI[st.id] = formatTime(startMinutes + st.offset);
    }
    trains.push({
      id: `MRT-HI-${trainCounterHI.toString().padStart(3, '0')}`,
      line: 'MRT',
      destination: 'Bundaran HI',
      schedule: scheduleHI
    });
    trainCounterHI++;

    // Southbound (Arah Lebak Bulus)
    const scheduleLB = {};
    for (const st of stationsSouthbound) {
      scheduleLB[st.id] = formatTime(startMinutes + st.offset);
    }
    trains.push({
      id: `MRT-LB-${trainCounterLB.toString().padStart(3, '0')}`,
      line: 'MRT',
      destination: 'Lebak Bulus Grab',
      schedule: scheduleLB
    });
    trainCounterLB++;
  }
}

fs.writeFileSync('d:/side/Commuter Tracking/static/mrt-schedule.json', JSON.stringify(trains, null, 2));
console.log(`Generated ${trains.length} trains successfully.`);
