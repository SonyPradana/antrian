const base_api_url = process.env.API_URL ?? 'http://localhost/api'

export const config = {
    common: {
        interval: Number(process.env.INTERVAL_MS) ?? 30_000,
    },
    hook: {
        url: process.env.API_URL ?? 'http://localhost/hook'
    },
    api: {
        url: base_api_url,
        reset_url: `${base_api_url}/reset`,
        gets_url: `${base_api_url}/antrian`,
        called_url: `${base_api_url}/dipanggil`,
        queue_url: `${base_api_url}/baru`,
    },
}