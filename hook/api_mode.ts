import type { FingerUnit } from '../model/finger_unit'
import { groupByKodePrefix } from '../hook-worker'
import { config } from '../config/hook'

const log_date = new Date().toISOString()

export async function reset() {
    await fetch(`${config.api.reset_url}?poli=full_reset`)
        .then()
        .catch(() => console.log(`[WARM] ${log_date}: cant reset antrian poli`))
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

        if (groupedQueue[poliKey].at(-1)?.Kode !== prevQueue[poliKey].at(-1)?.Kode) {
            console.log(`[INFO] ${log_date}: send poli ${poliKey} with total queue is ${totalQueue}`);

            fetch(`${config.api.queue_url}?poli=${poliKey.toUpperCase()}&antrian=${totalQueue}`)
                .then()
                .catch(console.error);

            return;
        }

        console.log(`[WARM] ${log_date}: data not sent, poli ${poliKey} have ${totalQueue}`);
    });

    sortedPoliKeys.forEach((poliKey) => {
        const lastCalledKode = groupedCall[poliKey].at(-1)?.Kode;
        const lastCalledNumber = lastCalledKode ? parseInt(lastCalledKode.replace(/^[a-zA-Z]+/, ''), 10) : undefined;

        // cache
        const prevCalledKode = prevCall[poliKey].at(-1)?.Kode;

        if ((lastCalledKode !== undefined && prevCalledKode !== undefined) && prevCalledKode === lastCalledKode) {
            console.log(`[INFO] ${log_date}: data not sent, ${lastCalledKode} not changed. ${prevCalledKode}`);
            return;
        }

        if (lastCalledNumber !== undefined) {
            console.log(`[INFO] ${log_date}: send poli ${poliKey} with last call is ${lastCalledNumber}`);

            fetch(`${config.api.called_url}?poli=${poliKey.toUpperCase()}&antrian=${lastCalledNumber}`)
                .then()
                .catch(console.error);

            return;
        }

        console.log(`[INFO] ${log_date}: data not sent, poli ${poliKey} has empty call`);
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
