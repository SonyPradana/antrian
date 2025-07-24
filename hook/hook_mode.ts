import { getDate } from './api_mode';
import type { FingerUnit } from '../model/finger_unit'
import { config } from '../config/hook'

interface PoliUnit extends FingerUnit {
    Nomor: number;
}

interface AntrianResponse {
    success: boolean;
    code: number;
    data: {
        called?: Partial<Record<'a' | 'b' | 'c' | 'd', PoliUnit>>;
        queue?: Partial<Record<'a' | 'b' | 'c' | 'd', PoliUnit>>;
        last?: PoliUnit;
    };
    error: boolean;
}

export async function sendHook(
    groupedCall: { a: FingerUnit[]; b: FingerUnit[]; c: FingerUnit[]; d: FingerUnit[] },
    groupedQueue: { a: FingerUnit[]; b: FingerUnit[]; c: FingerUnit[]; d: FingerUnit[] }
): Promise<void> {
    const called: Partial<{ a: FingerUnit; b: FingerUnit; c: FingerUnit; d: FingerUnit }> = {};
    const queue: Partial<{ a: FingerUnit; b: FingerUnit; c: FingerUnit; d: FingerUnit }> = {};
    (['a', 'b', 'c', 'd'] as const).forEach((key) => {
        const lastCall = groupedCall[key].at(-1);
        if (lastCall) called[key] = lastCall;
        const lastQueue = groupedQueue[key].at(-1);
        if (lastQueue) queue[key] = lastQueue;
    });

    const payload: Record<string, any> = { };
    if (Object.keys(called).length > 0) payload.called = called;
    if (Object.keys(queue).length > 0) payload.queue = queue;

    const response = await fetch(config.hook.url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
    const json = await response.json() as AntrianResponse;

    if (json.success === true) {
        console.log(`  [OK] ${getDate()} succes send new antrianm with last call is: ${json.data?.last?.Kode ?? '--'}.`);
    } else {
        console.log(`[INFO] ${getDate()}: data not sent, no data changed.`);
    }
}

export async function reset() {
    const response = await fetch(config.hook.url, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json' },
    })
    const json = await response.json() as AntrianResponse;

    if (json.success === true) {
        console.log(`  [OK] ${getDate()} succes reset antrian.`);
    } else {
        console.log(`[INFO] ${getDate()}: fail to reset antrian.`);
    }
}