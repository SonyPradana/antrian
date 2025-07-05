import { config as env } from 'dotenv'
env()

import { sendHook } from './hook-worker'
import { config } from './config/hook'
import { reset } from './hook/api_mode'

// lets go!!!
reset()
sendHook()
setInterval(sendHook, config.common.interval)
