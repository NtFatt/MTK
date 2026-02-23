import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  console.log('⏳ Checking MySQL connection...');

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const [rows] = await conn.query('SELECT 1 AS ok');
  console.log('✅ Connected. SELECT 1 =>', rows);

  const [db] = await conn.query('SELECT DATABASE() AS db');
  console.log('✅ Using database =>', db);

  await conn.end();
  console.log('🎉 DB connection OK');
}

main().catch((err) => {
  console.error('❌ DB connection FAILED');
  console.error(err.message);
  process.exit(1);
});
