import parsedScheduleRaw from '../../../static/schedule.json';
import mrtScheduleRaw from '../../../static/mrt-schedule.json';
import mrtStationsRaw from '../../../static/mrt-stations.json';
import nationalGapekaRaw from '../../../static/data/national-gapeka.json';
import nationalStationsRaw from '../../../static/data/all-national-stations.json';

let parsedSchedule: any = parsedScheduleRaw;
const getLineBySchedule = (scheduleKeys: string[], relasi: string) => {
    for (const id of scheduleKeys) {
        if (['TPK', 'TPO', 'AC'].includes(id)) return 'TANJUNGPRIUK';
        if (['TNG', 'BPR', 'PI', 'BOI', 'RW', 'KDS', 'PSG', 'GF', 'PB'].includes(id)) return 'TANGERANG';
        if (['RK', 'CTR', 'MJ', 'CKY', 'TGS', 'TEJ', 'DAR', 'CJT', 'PRP', 'JTK', 'CC', 'CSK', 'SRP', 'RU', 'SDM', 'JMU', 'PDJ', 'KBY', 'PLM'].includes(id)) return 'RANGKASBITUNG';
        if (['BOO', 'NMO', 'BJD', 'CTA', 'DP', 'DPB', 'POC', 'UI', 'UP', 'LNA', 'TNT', 'PND', 'CW', 'TEB', 'JAY', 'MGB', 'SW', 'JUA', 'GDD', 'CKI'].includes(id)) return 'BOGOR';
        if (['CKR', 'MTM', 'CIT', 'TB', 'BKST', 'BKS', 'KRI', 'CUK', 'KLDB', 'BUA', 'KLD', 'POK', 'KMT', 'GST', 'PSE', 'KMO', 'RJW', 'AK'].includes(id)) return 'CIKARANG';
    }
    
    // Fallback to relasi parsing if somehow no unique stations are found
    const r = relasi.toLowerCase();
    if (r.includes('bks') || r.includes('ckr') || r.includes('kpb') || r.includes('ak') || r.includes('jng')) return 'CIKARANG';
    if (r.includes('ru') || r.includes('srp') || r.includes('thb') || r.includes('prp') || r.includes('rks')) return 'RANGKASBITUNG';
    if (r.includes('tng') || r.includes('du')) return 'TANGERANG';
    if (r.includes('tpk')) return 'TANJUNGPRIUK';
    return 'BOGOR';
};

const idToName: Record<string, string> = {
    'JAKK': 'Jakarta Kota',
    'MRI': 'Manggarai',
    'BOO': 'Bogor',
    'DP': 'Depok',
    'BKS': 'Bekasi',
    'CKR': 'Cikarang',
    'THB': 'Tanah Abang',
    'SUD': 'Sudirman',
    'RU': 'Rawa Buntu',
    'RK': 'Rangkasbitung',
    'SRP': 'Serpong',
    'TNG': 'Tangerang',
    'DU': 'Duri',
    'TPK': 'Tanjung Priok',
    'NMO': 'Nambo',
    'AK': 'Angke',
    'KPB': 'Kampung Bandan',
    'PSE': 'Pasar Senen',
    'PRP': 'Parung Panjang',
    'TGS': 'Tigaraksa',
    'GRG': 'Grogol'
};

import { realStationIds } from '$lib/mapData';

const idToNameFull: Record<string, string> = {};
Object.entries(realStationIds).forEach(([name, id]) => {
    const capitalizedName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (!idToNameFull[id]) {
        idToNameFull[id] = capitalizedName;
    }
});

const nationalIdToName: Record<string, string> = {};
nationalStationsRaw.forEach((s: any) => {
    const id = s.code || s.id;
    if (id && s.name) {
        nationalIdToName[id] = s.name;
    }
});

const uniqueStationIds = new Set<string>();
const stationTypes: Record<string, string> = {};

Object.values(parsedSchedule).forEach((train: any) => {
    Object.keys(train.schedule).forEach(id => {
        uniqueStationIds.add(id);
        stationTypes[id] = 'CL';
    });
});

mrtScheduleRaw.forEach((train: any) => {
    Object.keys(train.schedule).forEach(id => {
        uniqueStationIds.add(id);
        stationTypes[id] = 'MRT';
    });
});

nationalGapekaRaw.forEach((train: any) => {
    Object.keys(train.schedule).forEach(id => {
        uniqueStationIds.add(id);
        if (!stationTypes[id]) {
            stationTypes[id] = train.line;
        }
    });
});

const mrtIdToName: Record<string, string> = {};
mrtStationsRaw.forEach((s: any) => {
    if (s.id) mrtIdToName[s.id] = s.name;
});

export const getStationName = (id: string): string => {
    return idToNameFull[id] || nationalIdToName[id] || idToName[id] || mrtIdToName[id] || id;
};

export const stationsList = Array.from(uniqueStationIds).map(id => ({
    id,
    name: getStationName(id),
    type: stationTypes[id]
})).sort((a, b) => a.name.localeCompare(b.name));

const clTrains = Object.entries(parsedSchedule).map(([id, train]: [string, any]) => {
    const keys = Object.keys(train.schedule);
    const firstStop = keys[0];
    const lastStop = keys[keys.length - 1];
    const origin = getStationName(firstStop);
    const destination = getStationName(lastStop);

    return {
        id,
        line: getLineBySchedule(keys, train.relasi),
        origin,
        destination,
        schedule: train.schedule
    };
});

const mrtTrains = mrtScheduleRaw.map((train: any) => {
    const keys = Object.keys(train.schedule);
    const originCode = keys[0];
    return {
        ...train,
        origin: train.origin || getStationName(originCode)
    };
});

const nationalTrains = nationalGapekaRaw.map((train: any) => {
    const keys = Object.keys(train.schedule);
    const originCode = keys[0];
    return {
        ...train,
        origin: train.origin || getStationName(originCode)
    };
});

export const allTrains = [...clTrains, ...mrtTrains, ...nationalTrains];

