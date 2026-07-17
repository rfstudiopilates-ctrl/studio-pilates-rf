-- ===========================================
-- Studio Pilates RF — Instalación completa (schema v1.0.0)
-- Única fuente de verdad del esquema. Ejecutar UNA vez en base vacía.
--
-- Windows (PowerShell):
--   Get-Content database\init.sql | mysql -u root -p
--
-- Linux / macOS:
--   mysql -u root -p < database/init.sql
--
-- MySQL Workbench / DBeaver: abrir y ejecutar este archivo completo.
--
-- Incluye: settings, auth, clientes, planes, finanzas, horarios, clases,
-- reservas, drop-in, cambios de horario, push, comprobantes y datos demo.
-- En PRODUCCIÓN: rotá las contraseñas demo antes de NODE_ENV=production.
-- ===========================================

CREATE DATABASE IF NOT EXISTS studio_pilates_rf
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE studio_pilates_rf;

-- -------------------------------------------
-- Configuración del estudio (una instancia)
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  studio_name VARCHAR(150) NOT NULL DEFAULT 'Studio Pilates RF',
  logo_url VARCHAR(500) NULL,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#F4C2C2',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#1A1A1A',
  accent_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  background_color VARCHAR(7) NOT NULL DEFAULT '#F8F8F8',
  whatsapp_number VARCHAR(20) NULL,
  whatsapp_messages JSON NULL,
  notification_settings JSON NULL,
  max_class_capacity TINYINT UNSIGNED NOT NULL DEFAULT 6,
  class_duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  cancellation_hours TINYINT UNSIGNED NOT NULL DEFAULT 3,
  pending_hold_hours TINYINT UNSIGNED NOT NULL DEFAULT 24,
  block_booking_on_debt TINYINT(1) NOT NULL DEFAULT 1,
  debt_booking_block_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  recovery_expires_end_of_month TINYINT(1) NOT NULL DEFAULT 1,
  drop_in_plan_id INT UNSIGNED NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  fiscal_name VARCHAR(200) NULL,
  fiscal_id VARCHAR(50) NULL,
  fiscal_address VARCHAR(300) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB;

INSERT INTO settings (
  id,
  studio_name,
  whatsapp_messages,
  notification_settings
)
VALUES (
  1,
  'Studio Pilates RF',
  JSON_OBJECT(
    'reminder', 'Hola {nombre}, te recordamos tu clase del {fecha} a las {hora} en {estudio}.',
    'debtNotice', 'Hola {nombre}, te recordamos que tenés una deuda pendiente de {monto} en {estudio}. Por favor regularizá el pago cuando puedas.',
    'paymentReceipt', 'Hola {nombre}, registramos tu pago de {monto} en {estudio}. Comprobante {comprobante} ({fecha}).',
    'guestDropInOffer', 'Hola {nombre}! Te confirmo que podemos darte el turno del {fecha} a las {hora} en {estudio}.\n\nPara reservarlo necesitamos la seña. ¿Cómo preferís pagar? Una vez acreditada te dejo el lugar confirmado.\n\n¡Gracias!',
    'credentialsCreated', 'Hola {nombre}! Te damos la bienvenida a {estudio}.\n\nTus datos de acceso:\nUsuario: {usuario}\nContraseña: {contraseña}\n\nPodés ingresar desde: {enlace}',
    'credentialsResend', 'Hola {nombre}! Te reenviamos tus datos de acceso a {estudio}.\n\nUsuario: {usuario}\nContraseña: {contraseña}\n\nPodés ingresar desde: {enlace}'
  ),
  JSON_OBJECT(
    'admin', JSON_OBJECT(
      'newReservation', true,
      'pendingRequest', true,
      'cancellation', true,
      'scheduleChange', true
    ),
    'client', JSON_OBJECT(
      'reservationApproved', true,
      'reminder24h', true,
      'cancellation', true,
      'scheduleChangeApproved', true,
      'expirationNotice', true
    )
  )
)
ON DUPLICATE KEY UPDATE studio_name = VALUES(studio_name);

-- -------------------------------------------
-- Usuarios administradores
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(150) NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role ENUM('admin') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL,
  pwa_installed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_active (is_active)
) ENGINE=InnoDB;

-- -------------------------------------------
-- Clientes (autenticación y datos básicos)
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NULL,
  status ENUM('active', 'debt', 'suspended') NOT NULL DEFAULT 'active',
  internal_notes TEXT NULL,
  last_login_at TIMESTAMP NULL,
  pwa_installed_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_username (username),
  KEY idx_clients_status (status),
  KEY idx_clients_phone (phone),
  KEY idx_clients_full_name (full_name),
  KEY idx_clients_deleted (deleted_at)
) ENGINE=InnoDB;

-- -------------------------------------------
-- Historial de clientes
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS client_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT UNSIGNED NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSON NULL,
  performed_by_type ENUM('admin', 'system', 'client') NOT NULL DEFAULT 'admin',
  performed_by_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client_history_client (client_id),
  KEY idx_client_history_created (created_at),
  KEY idx_client_history_action (action_type),
  CONSTRAINT fk_client_history_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------
-- Refresh tokens (admin y cliente)
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_type ENUM('admin', 'client') NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_subject (subject_type, subject_id),
  KEY idx_refresh_tokens_expires (expires_at)
) ENGINE=InnoDB;

-- -------------------------------------------
-- Tokens de recuperación de contraseña (admin)
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
  KEY idx_password_reset_tokens_user (user_id),
  KEY idx_password_reset_tokens_expires (expires_at),
  CONSTRAINT fk_password_reset_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------
-- Planes del estudio
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL,
  weekly_classes TINYINT UNSIGNED NOT NULL DEFAULT 0,
  monthly_classes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  duration_days SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_plans_status (status),
  KEY idx_plans_name (name)
) ENGINE=InnoDB;

-- FK de settings → plans (settings se crea antes; se agrega recién acá)
ALTER TABLE settings
  ADD CONSTRAINT fk_settings_drop_in_plan
    FOREIGN KEY (drop_in_plan_id) REFERENCES plans (id)
    ON DELETE SET NULL;

-- -------------------------------------------
-- Planes asignados a clientes
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS client_plans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT UNSIGNED NOT NULL,
  plan_id INT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
  price_snapshot DECIMAL(10, 2) NOT NULL,
  weekly_classes_limit TINYINT UNSIGNED NOT NULL DEFAULT 0,
  monthly_classes_limit SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  weekly_classes_used TINYINT UNSIGNED NOT NULL DEFAULT 0,
  monthly_classes_used SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  week_reset_at DATE NULL,
  month_reset_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client_plans_client (client_id),
  KEY idx_client_plans_plan (plan_id),
  KEY idx_client_plans_status (status),
  KEY idx_client_plans_dates (start_date, end_date),
  CONSTRAINT fk_client_plans_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_client_plans_plan
    FOREIGN KEY (plan_id) REFERENCES plans (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO plans (name, description, price, weekly_classes, monthly_classes, duration_days, status)
SELECT 'Mensual 1', '3 clases por semana (12 en el abono). Vigencia 4 semanas. Clases no usadas o canceladas a tiempo se recuperan hasta el fin del plan.', 45000.00, 3, 12, 28, 'active'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Mensual 1');

INSERT INTO plans (name, description, price, weekly_classes, monthly_classes, duration_days, status)
SELECT 'Mensual 2', '2 clases por semana (8 en el abono). Vigencia 4 semanas. Clases no usadas o canceladas a tiempo se recuperan hasta el fin del plan.', 38000.00, 2, 8, 28, 'active'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Mensual 2');

INSERT INTO plans (name, description, price, weekly_classes, monthly_classes, duration_days, status)
SELECT 'Clase individual', 'Una clase suelta. Válida por 5 días desde la asignación; si no se usa en ese plazo, se pierde.', 5000.00, 1, 1, 5, 'active'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Clase individual');

UPDATE settings
SET drop_in_plan_id = (
  SELECT id FROM (
    SELECT id FROM plans WHERE name = 'Clase individual' AND status = 'active' ORDER BY id ASC LIMIT 1
  ) AS drop_in_plan
)
WHERE id = 1 AND drop_in_plan_id IS NULL;

-- -------------------------------------------
-- Movimientos financieros (cuenta corriente)
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS financial_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT UNSIGNED NOT NULL,
  type ENUM('payment', 'debt', 'credit', 'debit') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  payment_method ENUM('cash', 'transfer', 'credit_card', 'debit_card') NULL,
  reference_type VARCHAR(50) NULL,
  reference_id INT UNSIGNED NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  created_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_financial_movements_client (client_id),
  KEY idx_financial_movements_type (type),
  KEY idx_financial_movements_payment_method (payment_method),
  KEY idx_financial_movements_created (created_at),
  KEY idx_financial_movements_reference (reference_type, reference_id),
  CONSTRAINT fk_financial_movements_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_financial_movements_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES users (id)
    ON DELETE SET NULL,
  CONSTRAINT chk_financial_movements_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- -------------------------------------------
-- Plantillas de horario semanal
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_templates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  day_of_week TINYINT UNSIGNED NOT NULL COMMENT '1=Lunes ... 7=Domingo',
  start_time TIME NOT NULL,
  capacity TINYINT UNSIGNED NULL,
  duration_minutes SMALLINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedule_templates_day_time (day_of_week, start_time),
  KEY idx_schedule_templates_active (is_active)
) ENGINE=InnoDB;

-- -------------------------------------------
-- Clases generadas
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS generated_classes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_template_id INT UNSIGNED NULL,
  class_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity TINYINT UNSIGNED NOT NULL,
  booked_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('scheduled', 'cancelled', 'completed') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_generated_classes_date_time (class_date, start_time),
  KEY idx_generated_classes_date (class_date),
  KEY idx_generated_classes_status (status),
  KEY idx_generated_classes_template (schedule_template_id),
  CONSTRAINT fk_generated_classes_template
    FOREIGN KEY (schedule_template_id) REFERENCES schedule_templates (id)
    ON DELETE SET NULL,
  CONSTRAINT chk_generated_classes_capacity CHECK (booked_count <= capacity)
) ENGINE=InnoDB;

-- -------------------------------------------
-- Créditos de recuperación
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS recovery_credits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT UNSIGNED NOT NULL,
  source_reservation_id BIGINT UNSIGNED NOT NULL,
  expires_at DATE NOT NULL,
  status ENUM('available', 'used', 'expired') NOT NULL DEFAULT 'available',
  used_reservation_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recovery_credits_client (client_id),
  KEY idx_recovery_credits_status (status),
  KEY idx_recovery_credits_expires (expires_at),
  CONSTRAINT fk_recovery_credits_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------
-- Reservas recurrentes
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_reservations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT UNSIGNED NOT NULL,
  schedule_template_id INT UNSIGNED NOT NULL,
  client_plan_id INT UNSIGNED NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  status ENUM('active', 'paused', 'cancelled') NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NULL,
  created_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recurring_client_template (client_id, schedule_template_id),
  KEY idx_recurring_reservations_client (client_id),
  KEY idx_recurring_reservations_status (status),
  CONSTRAINT fk_recurring_reservations_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recurring_reservations_template
    FOREIGN KEY (schedule_template_id) REFERENCES schedule_templates (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recurring_reservations_plan
    FOREIGN KEY (client_plan_id) REFERENCES client_plans (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_recurring_reservations_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------
-- Reservas de clases
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS class_reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id INT UNSIGNED NOT NULL,
  generated_class_id BIGINT UNSIGNED NOT NULL,
  client_plan_id INT UNSIGNED NULL,
  recovery_credit_id BIGINT UNSIGNED NULL,
  recurring_reservation_id INT UNSIGNED NULL,
  status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') NOT NULL DEFAULT 'confirmed',
  booking_type ENUM('standard', 'recovery', 'recurring', 'drop_in') NOT NULL DEFAULT 'standard',
  consumes_plan TINYINT(1) NOT NULL DEFAULT 1,
  notes VARCHAR(500) NULL,
  cancelled_at TIMESTAMP NULL,
  cancelled_by ENUM('client', 'admin') NULL,
  cancellation_reason VARCHAR(500) NULL,
  created_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reservations_client_class (client_id, generated_class_id),
  KEY idx_reservations_client (client_id),
  KEY idx_reservations_class (generated_class_id),
  KEY idx_reservations_status (status),
  KEY idx_reservations_booking_type (booking_type),
  KEY idx_reservations_status_booking (status, booking_type),
  KEY idx_reservations_recurring (recurring_reservation_id),
  KEY idx_reservations_created (created_at),
  CONSTRAINT fk_reservations_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reservations_class
    FOREIGN KEY (generated_class_id) REFERENCES generated_classes (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reservations_client_plan
    FOREIGN KEY (client_plan_id) REFERENCES client_plans (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_reservations_recovery_credit
    FOREIGN KEY (recovery_credit_id) REFERENCES recovery_credits (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_reservations_recurring
    FOREIGN KEY (recurring_reservation_id) REFERENCES recurring_reservations (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_reservations_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- FKs circulares recovery_credits ↔ class_reservations
ALTER TABLE recovery_credits
  ADD CONSTRAINT fk_recovery_credits_source
    FOREIGN KEY (source_reservation_id) REFERENCES class_reservations (id)
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_recovery_credits_used
    FOREIGN KEY (used_reservation_id) REFERENCES class_reservations (id)
    ON DELETE SET NULL;

-- -------------------------------------------
-- Solicitudes de cambio de horario
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_change_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NOT NULL,
  client_id INT UNSIGNED NOT NULL,
  from_generated_class_id BIGINT UNSIGNED NOT NULL,
  to_generated_class_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  reason VARCHAR(500) NULL,
  admin_notes VARCHAR(500) NULL,
  reviewed_by_admin_id INT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_schedule_change_requests_client (client_id),
  KEY idx_schedule_change_requests_status (status),
  KEY idx_schedule_change_requests_reservation (reservation_id),
  KEY idx_schedule_change_requests_from_class (from_generated_class_id),
  KEY idx_schedule_change_requests_to_class (to_generated_class_id),
  CONSTRAINT fk_schedule_change_requests_reservation
    FOREIGN KEY (reservation_id) REFERENCES class_reservations (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_schedule_change_requests_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_schedule_change_requests_from_class
    FOREIGN KEY (from_generated_class_id) REFERENCES generated_classes (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_schedule_change_requests_to_class
    FOREIGN KEY (to_generated_class_id) REFERENCES generated_classes (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_schedule_change_requests_admin
    FOREIGN KEY (reviewed_by_admin_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------
-- Notificaciones push y logs
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_type ENUM('admin', 'client') NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh_key VARCHAR(255) NOT NULL,
  auth_key VARCHAR(255) NOT NULL,
  device_label VARCHAR(150) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_subscriptions_endpoint (endpoint),
  KEY idx_push_subscriptions_user (user_type, user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel ENUM('push', 'whatsapp', 'in_app') NOT NULL,
  recipient_type ENUM('admin', 'client') NOT NULL,
  recipient_id INT UNSIGNED NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  payload JSON NULL,
  whatsapp_phone VARCHAR(20) NULL,
  whatsapp_url TEXT NULL,
  status ENUM('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notification_logs_recipient (recipient_type, recipient_id),
  KEY idx_notification_logs_event (event_type),
  KEY idx_notification_logs_status (status),
  KEY idx_notification_logs_created (created_at),
  KEY idx_notification_logs_unread (recipient_type, recipient_id, channel, read_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_reminders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NOT NULL,
  reminder_type ENUM('24h') NOT NULL DEFAULT '24h',
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_reminders_reservation (reservation_id, reminder_type),
  CONSTRAINT fk_notification_reminders_reservation
    FOREIGN KEY (reservation_id) REFERENCES class_reservations (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------
-- Comprobantes de pago
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS payment_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movement_id BIGINT UNSIGNED NOT NULL,
  receipt_number VARCHAR(30) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issued_by_admin_id INT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_receipts_movement (movement_id),
  UNIQUE KEY uq_payment_receipts_number (receipt_number),
  KEY idx_payment_receipts_issued (issued_at),
  CONSTRAINT fk_payment_receipts_movement
    FOREIGN KEY (movement_id) REFERENCES financial_movements (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_payment_receipts_admin
    FOREIGN KEY (issued_by_admin_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------
-- Usuarios iniciales (SOLO desarrollo / instalación)
-- Admin: admin / Admin1234
-- Cliente: cliente.demo / Cliente1234
-- En PRODUCCIÓN: cambiá estas contraseñas o eliminá las cuentas
-- ANTES de arrancar con NODE_ENV=production (la API lo exige).
-- -------------------------------------------
INSERT INTO users (email, username, password_hash, full_name, role, is_active)
SELECT
  'admin@studiopilatesrf.com',
  'admin',
  '$2a$10$6xQbHb2jyugqFhqHGTBN.eU/EceZuUPjw1Y5sw4r9WW/t24xtyfr2',
  'Administrador',
  'admin',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'admin'
);

INSERT INTO clients (username, password_hash, full_name, phone, status)
SELECT
  'cliente.demo',
  '$2a$10$p1Yoq4doRyEsMCs/v2rR0.LO3s5y8TeZwWgvqr1CgrCtbL2jweMNC',
  'Cliente Demo',
  '1122334455',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM clients WHERE username = 'cliente.demo'
);

INSERT INTO client_history (client_id, action_type, description, performed_by_type)
SELECT
  c.id,
  'client_created',
  'Cliente demo creado durante la instalación inicial.',
  'system'
FROM clients c
WHERE c.username = 'cliente.demo'
  AND NOT EXISTS (
    SELECT 1
    FROM client_history ch
    WHERE ch.client_id = c.id
      AND ch.action_type = 'client_created'
  );
