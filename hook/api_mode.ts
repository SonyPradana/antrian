import type { FingerUnit } from '../model/finger_unit'
import { groupByKodePrefix } from '../hook-worker'

const API_URL = process.env.API_URL!

export async function sendHook(
    date: string,
    groupedCall: { a: FingerUnit[]; b: FingerUnit[]; c: FingerUnit[]; d: FingerUnit[] },
    groupedQueue: { a: FingerUnit[]; b: FingerUnit[]; c: FingerUnit[]; d: FingerUnit[] }
): Promise<void> {
    // get previous queue
    const { call: prevCall, queue: prevQueue } = await getLastAntrian();

    ['a', 'b', 'c', 'd'].forEach((poliKey) => {
        const currentCalled = groupedCall[poliKey as keyof typeof groupedCall];
        const currentQueue = groupedQueue[poliKey as keyof typeof groupedQueue];
        const totalQueue = currentCalled.length + currentQueue.length;

        // cache
        const prevQueueList = prevQueue[poliKey as keyof typeof prevQueue];

        if (currentQueue.at(-1)?.Kode || prevQueueList.at(-1)?.Kode) {
            console.log(`[INFO] data not sent, queue avilable`);
            return;
        }

        // send only have queen (prevent duplicate send)
        if ( currentCalled.length > prevQueueList.length) {
            console.log(`[INFO] send poli ${poliKey} with total queue is ${totalQueue}`);

            fetch(`${API_URL}baru?poli=${poliKey.toUpperCase()}&antrian=${totalQueue}`)
                .then()
                .catch(console.error);

            return
        }


        console.log(`[WARM] data not sent, poli ${poliKey} have ${totalQueue}`);
    });

    ['a', 'b', 'c', 'd'].forEach((poliKey) => {
        const currentCalled = groupedCall[poliKey as keyof typeof groupedCall];
        const lastCalledKode = currentCalled.at(-1)?.Kode;
        const lastCalledNumber = lastCalledKode ? parseInt(lastCalledKode.replace(/^[a-zA-Z]+/, ''), 10) : undefined;

        // cache
        const prevCalledList = prevCall[poliKey as keyof typeof prevCall];
        const prevCalledKode = prevCalledList.at(-1)?.Kode;

        if ((lastCalledKode !== undefined && prevCalledKode !== undefined) && prevCalledKode === lastCalledKode) {
            console.log(`[INFO] data not sent, ${lastCalledKode} not changed. ${prevCalledKode}`);
            return;
        }

        if (lastCalledNumber !== undefined) {
            console.log(`[INFO] send poli ${poliKey} with last call is ${lastCalledNumber}`);

            fetch(`${API_URL}dipanggil?poli=${poliKey.toUpperCase()}&antrian=${lastCalledNumber}`)
                .then()
                .catch(console.error);

            return;
        }

        console.log(`[INFO] data not sent, poli ${poliKey} has empty call`);
    });

    return;
}

async function getLastAntrian() {
    const antrianResponse = await fetch(`${API_URL}antrian`);
    if (!antrianResponse.ok) {
        throw new Error(`Failed to fetch antrian: ${antrianResponse.status} ${antrianResponse.statusText}`);
    }

    const getAntrian = await antrianResponse.json() as { data: any[] };
    const antrian = mapToFingerUnits(getAntrian.data)
    const antrian_call = antrian.filter(row => row.Status.toLowerCase() === 'sudah')
    const antrian_queue = antrian.filter(row => row.Status.toLowerCase() === 'belum')

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
                //
                Kode: `${item.poli}${String(item.current).padStart(3, "0")}`,
                Status: 'sudah',
                Waktu: formatTime(item.current_times),
            });
        }
        const queueDiff = item.queueing // Math.max(item.queueing - item.current, 0);
        if (queueDiff > 0) {
            units.push({
                Kode: `${item.poli}${String(item.current).padStart(3, "0")}`,
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