import parsedScheduleRaw from '../../../static/schedule.json';

let parsedSchedule: any = parsedScheduleRaw;
const getLineByRelasi = (relasi: string) => {
    const r = relasi.toLowerCase();
    if (r.includes('bks') || r.includes('ckr') || r.includes('kpb')) return 'CIKARANG';
    if (r.includes('ru') || r.includes('srp') || r.includes('thb') || r.includes('prp') || r.includes('rks')) return 'RANGKASBITUNG';
    if (r.includes('tng') || r.includes('du')) return 'TANGERANG';
    if (r.includes('tpk')) return 'TANJUNGPRIUK';
    return 'BOGOR'; // fallback because Bogor is most common
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
    'RU': 'Rangkasbitung',
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
    'TGS': 'Tigaraksa'
};

import { realStationIds } from '$lib/mapData';

const idToNameFull: Record<string, string> = {};
Object.entries(realStationIds).forEach(([name, id]) => {
    const capitalizedName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (!idToNameFull[id]) {
        idToNameFull[id] = capitalizedName;
    }
});

const uniqueStationIds = new Set<string>();
Object.values(parsedSchedule).forEach((train: any) => {
    Object.keys(train.schedule).forEach(id => uniqueStationIds.add(id));
});

export const stationsList = Array.from(uniqueStationIds).map(id => ({
    id,
    name: idToNameFull[id] || idToName[id] || id
})).sort((a, b) => a.name.localeCompare(b.name));

export const allTrains = Object.entries(parsedSchedule).map(([id, train]: [string, any]) => {
    const parts = train.relasi.split('-');
    const destCode = parts[parts.length - 1].toUpperCase();
    const destination = idToName[destCode] || destCode;

    return {
        id,
        line: getLineByRelasi(train.relasi),
        destination,
        schedule: train.schedule
    };
});
