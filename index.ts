import { config as env } from 'dotenv'
env()

import { sendHook } from './hook-worker'
import { config } from './config/hook'
import { reset } from './hook/hook_mode'

// lets go!!!
await reset()
await sendHook()
setInterval(sendHook, config.common.interval)
