import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import PlansPanel from '../../components/plans/PlansPanel';
import AdminsPanel from '../../components/admins/AdminsPanel';
import StudioLogo from '../../components/studio/StudioLogo';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ColorInput } from '../../components/ui/ColorInput';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Toggle } from '../../components/ui/Toggle';
import PushNotificationBanner from '../../components/notifications/PushNotificationBanner';
import {
  DEFAULT_WHATSAPP_MESSAGES,
  NOTIFICATION_FIELDS,
  SETTINGS_TABS,
  WHATSAPP_MESSAGE_FIELDS,
} from '../../constants/settings';
import { formatCurrency } from '../../constants/plans';
import { usePlansList } from '../../hooks/usePlans';
import { useAdminSettings, useUpdateSettings } from '../../hooks/useSettings';
import { buildWhatsAppMessage, openWhatsApp } from '../../lib/whatsapp';
import { getErrorMessage } from '../../lib/formErrors';

const VALID_TABS = new Set(SETTINGS_TABS.map((tab) => tab.id));

function resolveTab(value) {
  return VALID_TABS.has(value) ? value : 'general';
}

function DropInPlanSelect({ value, onChange }) {
  const { data, isLoading } = usePlansList({ status: 'active', page: 1, limit: 100 });
  const plans = data?.items || [];

  return (
    <Select
      label="Plan para clase puntual"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={isLoading}
    >
      <option value="">Seleccionar plan...</option>
      {plans.map((plan) => (
        <option key={plan.id} value={plan.id}>
          {plan.name} · {formatCurrency(plan.price)}
        </option>
      ))}
    </Select>
  );
}

function SectionCard({ title, description, children, onSave, isSaving, message, error }) {
  return (
    <section className="glass-card p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
        </div>
        {onSave ? (
          <Button onClick={onSave} isLoading={isSaving}>
            Guardar cambios
          </Button>
        ) : null}
      </div>

      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      {children}
    </section>
  );
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get('tab')));
  const { data: settings, isLoading, isError } = useAdminSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    if (settings) {
      setForm({
        ...settings,
        pendingHoldHours: settings.pendingHoldHours ?? 24,
        blockBookingOnDebt: settings.blockBookingOnDebt !== false,
        debtBookingBlockAmount: Number(settings.debtBookingBlockAmount ?? 0),
        whatsappMessages: {
          ...DEFAULT_WHATSAPP_MESSAGES,
          ...(settings.whatsappMessages || {}),
        },
      });
    }
  }, [settings]);

  const subtitle = useMemo(() => {
    if (activeTab === 'planes') {
      return 'Creá y administrá los planes de membresía del estudio.';
    }

    if (activeTab === 'seguridad') {
      return 'Administrá las cuentas del panel y tu contraseña de acceso.';
    }

    return 'Personalizá tu estudio sin modificar código: branding, reglas y mensajes.';
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setFeedback({ message: '', error: '' });
    setActiveTab(tabId);

    if (tabId === 'general') {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({ tab: tabId }, { replace: true });
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateWhatsappMessage = (key, value) => {
    setForm((prev) => ({
      ...prev,
      whatsappMessages: {
        ...prev.whatsappMessages,
        [key]: value,
      },
    }));
  };

  const updateNotification = (group, key, value) => {
    setForm((prev) => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [group]: {
          ...prev.notificationSettings[group],
          [key]: value,
        },
      },
    }));
  };

  const saveSection = async (payload) => {
    setFeedback({ message: '', error: '' });

    try {
      const result = await updateSettings.mutateAsync(payload);
      setForm(result.settings);
      setFeedback({ message: result.message, error: '' });
    } catch (error) {
      setFeedback({ message: '', error: getErrorMessage(error, 'No se pudo guardar la configuración.') });
    }
  };

  const handleTestWhatsApp = () => {
    try {
      const message = buildWhatsAppMessage(form.whatsappMessages.reminder, {
        nombre: 'María',
        fecha: '03/07/2026',
        hora: '09:00',
        estudio: form.studioName,
      });

      openWhatsApp({
        phone: form.whatsappNumber,
        message,
      });
    } catch (error) {
      setFeedback({ message: '', error: getErrorMessage(error, 'No se pudo abrir WhatsApp.') });
    }
  };

  const tabsNav = (
    <div className="mb-6 rounded-2xl border border-border bg-white p-2 shadow-[0_8px_30px_rgba(26,26,26,0.04)]">
      <div className="flex flex-wrap gap-1">
        {SETTINGS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                isActive
                  ? 'bg-text text-white shadow-sm'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (activeTab === 'planes') {
    return (
      <AdminLayout title="Configuración" subtitle={subtitle}>
        {tabsNav}
        <PlansPanel />
      </AdminLayout>
    );
  }

  if (activeTab === 'seguridad') {
    return (
      <AdminLayout title="Configuración" subtitle={subtitle}>
        {tabsNav}
        <AdminsPanel />
      </AdminLayout>
    );
  }

  if (isLoading || !form) {
    return (
      <AdminLayout title="Configuración" subtitle="Cargando ajustes del estudio...">
        {tabsNav}
        <div className="glass-card p-6 text-sm text-text-muted">Cargando...</div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout title="Configuración">
        {tabsNav}
        <Alert variant="error">No se pudo cargar la configuración del estudio.</Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configuración" subtitle={subtitle}>
      {tabsNav}

      {activeTab === 'general' ? (
        <SectionCard
          title="Información general"
          description="Nombre y logo visibles en toda la plataforma."
          onSave={() =>
            saveSection({
              studioName: form.studioName,
              logoUrl: form.logoUrl || '',
            })
          }
          isSaving={updateSettings.isPending}
          message={feedback.message}
          error={feedback.error}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre del estudio"
              value={form.studioName}
              onChange={(event) => updateField('studioName', event.target.value)}
            />
            <Input
              label="URL del logo"
              placeholder="https://..."
              value={form.logoUrl || ''}
              onChange={(event) => updateField('logoUrl', event.target.value)}
            />
          </div>
          <div className="mt-6 flex items-center gap-4 rounded-xl bg-surface-muted p-4">
            <StudioLogo settings={form} size="lg" />
            <div>
              <p className="text-sm font-medium text-text">Vista previa</p>
              <p className="text-sm text-text-muted">{form.studioName}</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'branding' ? (
        <SectionCard
          title="Branding"
          description="Los colores se aplican en tiempo real en toda la aplicación."
          onSave={() =>
            saveSection({
              primaryColor: form.primaryColor,
              secondaryColor: form.secondaryColor,
              accentColor: form.accentColor,
              backgroundColor: form.backgroundColor,
            })
          }
          isSaving={updateSettings.isPending}
          message={feedback.message}
          error={feedback.error}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ColorInput
              label="Color principal"
              value={form.primaryColor}
              onChange={(value) => updateField('primaryColor', value)}
            />
            <ColorInput
              label="Color secundario"
              value={form.secondaryColor}
              onChange={(value) => updateField('secondaryColor', value)}
            />
            <ColorInput
              label="Color de acento"
              value={form.accentColor}
              onChange={(value) => updateField('accentColor', value)}
            />
            <ColorInput
              label="Color de fondo"
              value={form.backgroundColor}
              onChange={(value) => updateField('backgroundColor', value)}
            />
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'operations' ? (
        <SectionCard
          title="Reglas operativas"
          description="Configuración base para clases, cupos, cancelaciones y clase puntual."
          onSave={() =>
            saveSection({
              maxClassCapacity: Number(form.maxClassCapacity),
              classDurationMinutes: Number(form.classDurationMinutes),
              cancellationHours: Number(form.cancellationHours),
              pendingHoldHours: Number(form.pendingHoldHours ?? 24),
              blockBookingOnDebt: Boolean(form.blockBookingOnDebt),
              debtBookingBlockAmount: Number(form.debtBookingBlockAmount ?? 0),
              recoveryExpiresEndOfMonth: form.recoveryExpiresEndOfMonth,
              dropInPlanId: form.dropInPlanId ? Number(form.dropInPlanId) : null,
            })
          }
          isSaving={updateSettings.isPending}
          message={feedback.message}
          error={feedback.error}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Cupos máximos por clase"
              type="number"
              min="1"
              max="50"
              value={form.maxClassCapacity}
              onChange={(event) => updateField('maxClassCapacity', event.target.value)}
            />
            <Input
              label="Duración de clase (minutos)"
              type="number"
              min="15"
              max="240"
              value={form.classDurationMinutes}
              onChange={(event) => updateField('classDurationMinutes', event.target.value)}
            />
            <Input
              label="Horas mínimas para cancelar"
              type="number"
              min="0"
              max="72"
              value={form.cancellationHours}
              onChange={(event) => updateField('cancellationHours', event.target.value)}
            />
            <Input
              label="Horas de hold (solicitud puntual)"
              type="number"
              min="1"
              max="168"
              value={form.pendingHoldHours ?? 24}
              onChange={(event) => updateField('pendingHoldHours', event.target.value)}
            />
            <DropInPlanSelect
              value={form.dropInPlanId || ''}
              onChange={(value) =>
                updateField('dropInPlanId', value ? Number(value) : null)
              }
            />
          </div>
          <div className="mt-4 space-y-3">
            <Toggle
              id="recovery-expires"
              label="Las clases recuperadas expiran a fin de mes"
              description="Aplica a créditos de recuperación antiguos. Las cancelaciones a tiempo ahora vuelven al cupo del abono (catch-up) hasta el fin de vigencia."
              checked={form.recoveryExpiresEndOfMonth}
              onChange={(value) => updateField('recoveryExpiresEndOfMonth', value)}
            />
            <Toggle
              id="block-booking-on-debt"
              label="Bloquear reservas según monto de deuda"
              description="Si está activo, el cliente no puede reservar cuando su deuda llega al monto indicado. El admin sí puede cargarle turnos."
              checked={form.blockBookingOnDebt !== false}
              onChange={(value) => updateField('blockBookingOnDebt', value)}
            />
            {form.blockBookingOnDebt !== false ? (
              <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                <CurrencyInput
                  label="Monto a partir del cual se bloquea"
                  value={form.debtBookingBlockAmount ?? 0}
                  allowZero
                  onValueChange={(value) =>
                    updateField('debtBookingBlockAmount', value == null ? 0 : value)
                  }
                />
                <p className="mt-2 text-xs text-text-muted">
                  {Number(form.debtBookingBlockAmount || 0) <= 0
                    ? 'Con $0 se bloquea ante cualquier deuda (comportamiento anterior).'
                    : `El cliente puede reservar si su deuda es menor a ${formatCurrency(
                        form.debtBookingBlockAmount
                      )}. A partir de ese monto queda bloqueado.`}
                </p>
              </div>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-text-muted">
            El plan de clase puntual se asigna automáticamente cuando confirmás una solicitud
            sin plan. La seña se descuenta del precio y el resto queda en cuenta corriente.
            Las solicitudes sin confirmar liberan el cupo al vencer el hold o si la clase ya
            empezó.
          </p>
        </SectionCard>
      ) : null}

      {activeTab === 'whatsapp' ? (
        <SectionCard
          title="WhatsApp"
          description="Plantillas usadas al abrir WhatsApp Web desde la app. Cada una está conectada a un flujo concreto."
          onSave={() =>
            saveSection({
              whatsappNumber: form.whatsappNumber || '',
              whatsappMessages: form.whatsappMessages,
            })
          }
          isSaving={updateSettings.isPending}
          message={feedback.message}
          error={feedback.error}
        >
          <Input
            label="Número del estudio (solo para pruebas)"
            placeholder="+5491122334455"
            value={form.whatsappNumber || ''}
            onChange={(event) => updateField('whatsappNumber', event.target.value)}
          />
          <p className="mt-1 text-xs text-text-muted">
            Los mensajes reales se envían al teléfono del cliente. Este número solo se usa en la
            prueba de abajo.
          </p>

          <div className="mt-6 space-y-4">
            {WHATSAPP_MESSAGE_FIELDS.map((field) => (
              <div key={field.key} className="rounded-2xl border border-border/80 bg-surface-muted/30 p-4">
                <Textarea
                  label={field.label}
                  value={form.whatsappMessages?.[field.key] || ''}
                  onChange={(event) => updateWhatsappMessage(field.key, event.target.value)}
                />
                <div className="mt-2 space-y-1 text-xs text-text-muted">
                  <p>
                    Variables:{' '}
                    <span className="font-medium text-text">{field.placeholders}</span>
                  </p>
                  <p>
                    Se usa en: <span className="font-medium text-text">{field.usedIn}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button variant="secondary" onClick={handleTestWhatsApp}>
              Probar recordatorio de clase
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'notifications' ? (
        <SectionCard
          title="Notificaciones push"
          description="Activá este dispositivo y elegí qué avisos querés recibir en el celular."
          onSave={() =>
            saveSection({
              notificationSettings: form.notificationSettings,
            })
          }
          isSaving={updateSettings.isPending}
          message={feedback.message}
          error={feedback.error}
        >
          <PushNotificationBanner
            className="mb-6"
            title="Recibir avisos en este dispositivo"
            description="Cuando un cliente reserve, cancele o pida un cambio, te llega una notificación push al celular."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
                Avisos al administrador
              </h3>
              <div className="space-y-3">
                {NOTIFICATION_FIELDS.admin.map((field) => (
                  <Toggle
                    key={field.key}
                    id={`admin-${field.key}`}
                    label={field.label}
                    checked={form.notificationSettings.admin[field.key]}
                    onChange={(value) => updateNotification('admin', field.key, value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
                Avisos al cliente
              </h3>
              <div className="space-y-3">
                {NOTIFICATION_FIELDS.client.map((field) => (
                  <Toggle
                    key={field.key}
                    id={`client-${field.key}`}
                    label={field.label}
                    checked={form.notificationSettings.client[field.key]}
                    onChange={(value) => updateNotification('client', field.key, value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'fiscal' ? (
        <SectionCard
          title="Datos fiscales"
          description="Información para comprobantes y reportes futuros."
          onSave={() =>
            saveSection({
              fiscalName: form.fiscalName || '',
              fiscalId: form.fiscalId || '',
              fiscalAddress: form.fiscalAddress || '',
            })
          }
          isSaving={updateSettings.isPending}
          message={feedback.message}
          error={feedback.error}
        >
          <div className="grid gap-4">
            <Input
              label="Razón social"
              value={form.fiscalName || ''}
              onChange={(event) => updateField('fiscalName', event.target.value)}
            />
            <Input
              label="CUIT / Identificación fiscal"
              value={form.fiscalId || ''}
              onChange={(event) => updateField('fiscalId', event.target.value)}
            />
            <Textarea
              label="Domicilio fiscal"
              value={form.fiscalAddress || ''}
              onChange={(event) => updateField('fiscalAddress', event.target.value)}
              rows={3}
            />
          </div>
        </SectionCard>
      ) : null}
    </AdminLayout>
  );
}
