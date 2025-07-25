import mysql from 'mysql2/promise';
import { config } from './config/database';

export const db = await mysql.createConnection(config.db);
