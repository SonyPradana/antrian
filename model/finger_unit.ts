import { db } from '../db'

export async function getFingerUnitsByDate(unit: number, date: string): Promise<FingerUnit[]> {
    const [rows] = await db.query(`
        SELECT
            finger_unit.Kode,
            finger_unit.Status,
            DATE_FORMAT(finger_unit.TanggalFingger, '%h:%i') as Waktu
        FROM
            finger_unit
            LEFT JOIN units ON units.unit = finger_unit.UnitID
            LEFT JOIN finger_kehadiran ON finger_kehadiran.kehadiran = finger_unit.kehadiran
        WHERE
            units.id = ?
            AND finger_unit.TanggalFingger LIKE ?
        ORDER BY
            finger_unit.Status ASC,
            finger_unit.TanggalFingger ASC
        `, [unit, '%' + date + '%']);

    return rows as FingerUnit[];
}

export type FingerUnit = {
    Kode: string;
    Status: string;
    Waktu: string;
};