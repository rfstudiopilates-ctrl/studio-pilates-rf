import { pool } from '../../config/database.js';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_WHATSAPP_MESSAGES,
  normalizeWhatsappMessages,
} from './settings.defaults.js';

function parseJsonField(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapSettingsRow(row) {
  if (!row) {
    return null;
  }

  return {
    studioName: row.studio_name,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    backgroundColor: row.background_color,
    whatsappNumber: row.whatsapp_number,
    whatsappMessages: normalizeWhatsappMessages(
      parseJsonField(row.whatsapp_messages, DEFAULT_WHATSAPP_MESSAGES)
    ),
    notificationSettings: parseJsonField(row.notification_settings, DEFAULT_NOTIFICATION_SETTINGS),
    maxClassCapacity: row.max_class_capacity,
    classDurationMinutes: row.class_duration_minutes,
    cancellationHours: row.cancellation_hours,
    pendingHoldHours:
      row.pending_hold_hours == null ? 24 : Number(row.pending_hold_hours),
    blockBookingOnDebt:
      row.block_booking_on_debt == null ? true : Boolean(row.block_booking_on_debt),
    debtBookingBlockAmount:
      row.debt_booking_block_amount == null
        ? 0
        : Number(row.debt_booking_block_amount),
    recoveryExpiresEndOfMonth: Boolean(row.recovery_expires_end_of_month),
    dropInPlanId: row.drop_in_plan_id ? Number(row.drop_in_plan_id) : null,
    timezone: row.timezone,
    fiscalName: row.fiscal_name,
    fiscalId: row.fiscal_id,
    fiscalAddress: row.fiscal_address,
    updatedAt: row.updated_at,
  };
}

export async function getSettings() {
  const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
  return mapSettingsRow(rows[0]);
}

export async function updateSettings(payload) {
  const fields = [];
  const values = [];

  const mapping = {
    studioName: 'studio_name',
    logoUrl: 'logo_url',
    primaryColor: 'primary_color',
    secondaryColor: 'secondary_color',
    accentColor: 'accent_color',
    backgroundColor: 'background_color',
    whatsappNumber: 'whatsapp_number',
    maxClassCapacity: 'max_class_capacity',
    classDurationMinutes: 'class_duration_minutes',
    cancellationHours: 'cancellation_hours',
    pendingHoldHours: 'pending_hold_hours',
    blockBookingOnDebt: 'block_booking_on_debt',
    debtBookingBlockAmount: 'debt_booking_block_amount',
    recoveryExpiresEndOfMonth: 'recovery_expires_end_of_month',
    dropInPlanId: 'drop_in_plan_id',
    timezone: 'timezone',
    fiscalName: 'fiscal_name',
    fiscalId: 'fiscal_id',
    fiscalAddress: 'fiscal_address',
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);

      if (key === 'recoveryExpiresEndOfMonth' || key === 'blockBookingOnDebt') {
        values.push(payload[key] ? 1 : 0);
      } else if (key === 'dropInPlanId') {
        values.push(payload[key] ? Number(payload[key]) : null);
      } else if (key === 'debtBookingBlockAmount') {
        values.push(Number(Number(payload[key] || 0).toFixed(2)));
      } else {
        values.push(payload[key]);
      }
    }
  });

  if (payload.whatsappMessages !== undefined) {
    fields.push('whatsapp_messages = ?');
    values.push(JSON.stringify(normalizeWhatsappMessages(payload.whatsappMessages)));
  }

  if (payload.notificationSettings !== undefined) {
    fields.push('notification_settings = ?');
    values.push(JSON.stringify(payload.notificationSettings));
  }

  if (fields.length === 0) {
    return getSettings();
  }

  await pool.query(`UPDATE settings SET ${fields.join(', ')} WHERE id = 1`, values);

  return getSettings();
}

export function toPublicSettings(settings) {
  return {
    studioName: settings.studioName,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
    backgroundColor: settings.backgroundColor,
  };
}
