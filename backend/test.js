require('dotenv').config();
const { Pool } = require('pg');

console.log('Variáveis carregadas:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('PHONE_NUMBER_ID:', process.env.PHONE_NUMBER_ID);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'whatsapp_notifications',
  user: process.env.DB_USER || 'lima_jefferson',
  password: process.env.DB_PASSWORD || '',
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao conectar no banco:', err);
  } else {
    console.log('Conexão OK:', res.rows[0]);
  }
  pool.end();
});