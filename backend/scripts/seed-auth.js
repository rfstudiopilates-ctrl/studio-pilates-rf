import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';
import { hashPassword } from '../src/utils/crypto.js';
import * as authRepository from '../src/modules/auth/auth.repository.js';
import * as clientsRepository from '../src/modules/clients/clients.repository.js';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (key && value) {
      parsed[key] = value;
    }
  }

  return parsed;
}

async function seedAdmin() {
  const args = parseArgs();
  const email = (args.email || 'admin@studiopilatesrf.com').toLowerCase();
  const username = args.username || 'admin';
  const password = args.password || 'Admin1234';
  const fullName = args.name || 'Administrador';

  const existing = await authRepository.findAdminByEmail(email);

  if (existing) {
    console.log(`[SEED] Ya existe un administrador con email: ${email}`);
    return;
  }

  const existingUsername = await authRepository.findAdminByUsername(username);

  if (existingUsername) {
    console.log(`[SEED] Ya existe un administrador con usuario: ${username}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const adminId = await authRepository.createAdmin({
    email,
    username,
    passwordHash,
    fullName,
  });

  console.log('[SEED] Administrador creado correctamente');
  console.log(`  ID: ${adminId}`);
  console.log(`  Usuario: ${username}`);
  console.log(`  Email: ${email}`);
  console.log(`  Contraseña: ${password}`);
  console.log('  Cambiá la contraseña después del primer login.');
}

async function seedDemoClient() {
  const args = parseArgs();

  if (args['skip-client']) {
    return;
  }

  const username = args['client-username'] || 'cliente.demo';
  const password = args['client-password'] || 'Cliente1234';
  const fullName = args['client-name'] || 'Cliente Demo';
  const phone = args['client-phone'] || '1122334455';

  const existing = await clientsRepository.findClientByUsername(username);

  if (existing) {
    console.log(`[SEED] Ya existe un cliente con usuario: ${username}`);
    return;
  }

  const passwordHash = await hashPassword(password);

  const clientId = await clientsRepository.createClient({
    username,
    passwordHash,
    fullName,
    phone,
    status: 'active',
  });

  await clientsRepository.createClientHistory({
    clientId,
    actionType: 'client_created',
    description: 'Cliente demo creado por seed.',
    performedByType: 'system',
  });

  console.log('[SEED] Cliente demo creado correctamente');
  console.log(`  ID: ${clientId}`);
  console.log(`  Usuario: ${username}`);
  console.log(`  Contraseña: ${password}`);
}

async function main() {
  try {
    await pool.query('SELECT 1');
    await seedAdmin();
    await seedDemoClient();
    process.exit(0);
  } catch (error) {
    console.error('[SEED] Error:', error.message);
    process.exit(1);
  }
}

main();
