export const config = {
    db: {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT) ?? 3306,
        user: process.env.DB_USER ?? 'antrian',
        password: process.env.DB_PASS ?? 'antrian',
        database: process.env.DB_NAME ?? 'antrian_test',
    },
}