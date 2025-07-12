import type { FingerUnit } from '../model/finger_unit'
import { groupByKodePrefix } from '../hook-worker'
import { config } from '../config/hook'

export async function reset() {
    await fetch(`${config.api.reset_url}?poli=full_reset`)
        .then(response => {
            if (response.code === 200) {
                console.log(`[OK] ${getDate()}: success send reset antrian`)
            }
        })
        .catch(() => console.log(`[WARM] ${getDate()}: cant reset antrian poli`))
}

export async function sendHook(
    date: string,
    groupedCall: { a: FingerUnit[]; b: FingerUnit[]; c: FingerUnit[]; d: FingerUnit[] },
    groupedQueue: { a: FingerUnit[]; b: FingerUnit[]; c: FingerUnit[]; d: FingerUnit[] }
): Promise<void> {
    const poliKeys = ['a', 'b', 'c', 'd'] as const;
    const sortedPoliKeys = poliKeys.slice().sort((a, b) => {
        const waktu1 = groupedCall[a].at(-1)?.Waktu ?? '';
        const waktu2 = groupedCall[b].at(-1)?.Waktu ?? '';

        return waktu2.localeCompare(waktu1);
    });

    // get previous queue
    const { call: prevCall, queue: prevQueue } = await getLastAntrian();

    sortedPoliKeys.forEach((poliKey) => {
        const totalQueue = groupedCall[poliKey].length + groupedQueue[poliKey].length;

        const x2 = prevQueue[poliKey].at(-1)?.Kode;
        const y2 = x2 ? parseInt(x2.replace(/^[a-zA-Z]+/, ''), 10) : undefined;

        if (Number(y2) != totalQueue) {
            console.log(`  [OK] ${getDate()}: send poli ${poliKey} with total queue is ${totalQueue} and new queue is ${y2}`);
            fetch(`${config.api.queue_url}?poli=${poliKey.toUpperCase()}&antrian=${totalQueue}`)
                .then()
                .catch(console.error);

            return;
        }

        console.log(`[INFO] ${getDate()}: data not sent, poli ${poliKey} have ${totalQueue}`);
    });

    sortedPoliKeys.forEach((poliKey) => {
        const lastCalledKode = groupedCall[poliKey].at(-1)?.Kode;
        const lastCalledNumber = lastCalledKode ? parseInt(lastCalledKode.replace(/^[a-zA-Z]+/, ''), 10) : undefined;

        // cache
        const prevCalledKode = prevCall[poliKey].at(-1)?.Kode;

        if ((lastCalledKode !== undefined && prevCalledKode !== undefined) && prevCalledKode === lastCalledKode) {
            console.log(`[INFO] ${getDate()}: data not sent, ${lastCalledKode} not changed. ${prevCalledKode}`);
            return;
        }

        if (lastCalledNumber !== undefined) {
            console.log(`  [OK] ${getDate()}: send poli ${poliKey} with last call is ${lastCalledNumber}`);

            fetch(`${config.api.called_url}?poli=${poliKey.toUpperCase()}&antrian=${lastCalledNumber}`)
                .then()
                .catch(console.error);

            return;
        }

        console.log(`[INFO] ${getDate()}: data not sent, poli ${poliKey} has empty call`);
    });

    return;
}

async function getLastAntrian() {
    const antrianResponse = await fetch(`${config.api.gets_url}`);
    if (false === antrianResponse.ok) {
        throw new Error(`Failed to fetch antrian: ${antrianResponse.status} ${antrianResponse.statusText}`);
    }

    const getAntrian = await antrianResponse.json() as { data: any[] };
    const antrian = mapToFingerUnits(getAntrian.data)
    const antrian_call = antrian.filter(row => row.Status.toLowerCase() === 'sudah')
    const antrian_queue = antrian.filter(row => row.Status.toLowerCase() === 'belum' && false === antrian_call.includes(row))

    return {
        call: groupByKodePrefix(antrian_call),
        queue: groupByKodePrefix(antrian_queue)
    }
}

function mapToFingerUnits(data: any[]): FingerUnit[] {
    return data.flatMap(item => {
        const units: FingerUnit[] = [];

        if (item.current > 0) {
            units.push({
                Kode: `${item.poli}${String(item.current).padStart(3, "0")}`,
                Status: 'sudah',
                Waktu: formatTime(item.current_times),
            });
        }

        if (item.queueing > 0) {
            units.push({
                Kode: `${item.poli}${String(item.queueing).padStart(3, "0")}`,
                Status: 'belum',
                Waktu: formatTime(item.queueing_times),
            });
        }

        return units;
    });
}

function formatTime(time: string | number): string {
    if (typeof time === 'string') {
        return time.replace(/\s?(am|pm)/i, '').trim();
    }

    const date = new Date(time * 1000);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function getDate(
    timeZone: string = 'Asia/Jakarta',
    date: Date = new Date(),
    locale: string = 'en-US'
): string {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat(locale, options);
    const parts = formatter.formatToParts(date);

    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value.padStart(2, '0');
    const day = parts.find(part => part.type === 'day')?.value.padStart(2, '0');
    const hour = parts.find(part => part.type === 'hour')?.value.padStart(2, '0');
    const minute = parts.find(part => part.type === 'minute')?.value.padStart(2, '0');
    const second = parts.find(part => part.type === 'second')?.value.padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${getTimeZoneOffset(date, timeZone)}`;
}

function getTimeZoneOffset(date: Date, timeZone: string): string {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone }));
    const offset = utcDate.getTimezoneOffset();
    const sign = offset > 0 ? '-' : '+';
    const absOffset = Math.abs(offset);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');

    return `${sign}${hours}:${minutes}`;
}
