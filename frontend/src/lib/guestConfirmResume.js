const GUEST_CONFIRM_RESUME_KEY = 'sprf-guest-confirm-resume';
const RESUME_TTL_MS = 45 * 60 * 1000;

export function saveGuestConfirmResume(payload) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(
    GUEST_CONFIRM_RESUME_KEY,
    JSON.stringify({
      ...payload,
      savedAt: Date.now(),
    })
  );
}

export function readGuestConfirmResume() {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(GUEST_CONFIRM_RESUME_KEY);
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw);
    if (!data?.reservationId || !data?.savedAt) {
      sessionStorage.removeItem(GUEST_CONFIRM_RESUME_KEY);
      return null;
    }

    if (Date.now() - Number(data.savedAt) > RESUME_TTL_MS) {
      sessionStorage.removeItem(GUEST_CONFIRM_RESUME_KEY);
      return null;
    }

    return data;
  } catch {
    sessionStorage.removeItem(GUEST_CONFIRM_RESUME_KEY);
    return null;
  }
}

export function clearGuestConfirmResume() {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(GUEST_CONFIRM_RESUME_KEY);
}
