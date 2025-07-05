import { sendHook } from './hook-worker'

const API_URL = process.env.API_URL!
const interval = Number(process.env.INTERVAL_MS || 60000)

// first reset all
fetch(`${API_URL}reset?poli=full_reset`)
    .then()
    .catch(() => console.log('[WARM] cant reset antrian poli'))

// lets go!!!
sendHook()
setInterval(sendHook, interval)
