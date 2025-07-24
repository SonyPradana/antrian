import { getFingerUnitsByDate } from './model/finger_unit'
import { sendHook as send } from './hook/hook_mode'

import type { FingerUnit } from './model/finger_unit'

export function groupByKodePrefix(rows: FingerUnit[]): { a: FingerUnit[]; b: FingerUnit[]; c: FingerUnit[]; d: FingerUnit[] } {
    return rows.reduce((acc, row) => {
        if (undefined !== row.Kode[0]) {
            const prefix = row.Kode[0].toLowerCase();
            if (acc[prefix as keyof typeof acc]) {
                acc[prefix as keyof typeof acc].push(row);
            }
        }
        return acc;
    }, { a: [], b: [], c: [], d: [] } as { a: FingerUnit[]; b: FingerUnit[]; c: FingerUnit[]; d: FingerUnit[] });
}

export async function sendHook() {
  try {
    const date: string = new Date().toISOString().slice(0, 10)
    const anttrian = await getFingerUnitsByDate(99, date)

    const antrian_call = anttrian.filter(row => row.Status.toLowerCase() === 'sudah')
    const antrian_queue = anttrian.filter(row => row.Status.toLowerCase() === 'belum')

    send(
      groupByKodePrefix(antrian_call),
      groupByKodePrefix(antrian_queue)
    )

    return JSON.stringify(anttrian)
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()}]`, err)
  }
}

