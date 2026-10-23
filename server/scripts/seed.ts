/**
 * Regenerates demo user password hashes (Password123!)
 * Run: npm run seed -w server
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const PASSWORD = 'Password123!';
const emails = ['admin@best.app', 'maya@best.app', 'leo@best.app', 'sara@best.app'];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  for (const email of emails) {
    const [result] = await pool.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hash, email]
    );
    console.log('Updated', email, result);
  }
  console.log('\nDemo password for all seed users:', PASSWORD);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
