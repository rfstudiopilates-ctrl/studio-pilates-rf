import { env } from '../config/env.js';
import { comparePassword } from '../utils/crypto.js';
import * as authRepository from '../modules/auth/auth.repository.js';
import * as clientsRepository from '../modules/clients/clients.repository.js';

const DEMO_ADMIN_USERNAME = 'admin';
const DEMO_ADMIN_PASSWORD = 'Admin1234';
const DEMO_CLIENT_USERNAME = 'cliente.demo';
const DEMO_CLIENT_PASSWORD = 'Cliente1234';

/**
 * En producción, bloquear arranque si siguen activas las credenciales demo del init.sql.
 * Staging puede optar por ALLOW_DEMO_CREDENTIALS=true.
 */
export async function assertProductionCredentialSafety() {
  if (!env.isProduction) {
    return;
  }

  if (env.allowDemoCredentials) {
    console.warn(
      '[SEGURIDAD] ALLOW_DEMO_CREDENTIALS=true — se permiten usuarios demo en este entorno.'
    );
    return;
  }

  const problems = [];

  const admin = await authRepository.findAdminByUsername(DEMO_ADMIN_USERNAME);
  if (admin?.is_active && admin.password_hash) {
    const usesDemoPassword = await comparePassword(DEMO_ADMIN_PASSWORD, admin.password_hash);
    if (usesDemoPassword) {
      problems.push(
        `El admin "${DEMO_ADMIN_USERNAME}" todavía usa la contraseña demo (${DEMO_ADMIN_PASSWORD}). Cambiala o desactivá esa cuenta.`
      );
    }
  }

  const client = await clientsRepository.findClientByUsername(DEMO_CLIENT_USERNAME);
  if (client && client.status !== 'suspended' && client.passwordHash) {
    const usesDemoPassword = await comparePassword(DEMO_CLIENT_PASSWORD, client.passwordHash);
    if (usesDemoPassword) {
      problems.push(
        `El cliente "${DEMO_CLIENT_USERNAME}" todavía usa la contraseña demo. Cambiala, suspendelo o eliminalo.`
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `[SEGURIDAD] Credenciales demo inseguras en producción:\n- ${problems.join('\n- ')}\n` +
        `Para un entorno de prueba temporal podés setear ALLOW_DEMO_CREDENTIALS=true.`
    );
  }
}
