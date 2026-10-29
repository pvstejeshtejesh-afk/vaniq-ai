import { newId, nowIso } from '../lib/ids.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import type { Store } from '../store/store.js';
import type { Appointment } from '../types.js';

/**
 * Appointment booking with server-side conflict prevention.
 * An appointment is only confirmed after availability is checked and it is saved.
 */
export async function bookAppointment(
  store: Store,
  input: {
    businessId: string;
    leadId: string;
    callId?: string | null;
    employeeId?: string | null;
    startsAt: string;
    endsAt: string;
    timezone: string;
    title: string;
    note?: string | null;
  },
): Promise<Appointment> {
  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime()))
    throw badRequest('Invalid appointment date/time');
  if (end <= start) throw badRequest('endsAt must be after startsAt');
  if (start.getTime() < Date.now()) throw badRequest('Cannot book an appointment in the past');

  // Conflict check: overlap with any non-cancelled appointment for this business.
  const existing = await store.listAppointmentsByBusiness(input.businessId);
  const overlaps = existing.some((a) => {
    if (a.status === 'cancelled') return false;
    const aStart = new Date(a.startsAt).getTime();
    const aEnd = new Date(a.endsAt).getTime();
    return start.getTime() < aEnd && end.getTime() > aStart;
  });
  if (overlaps) throw conflict('That time slot is already booked');

  return store.createAppointment({
    businessId: input.businessId,
    leadId: input.leadId,
    callId: input.callId ?? null,
    employeeId: input.employeeId ?? null,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    timezone: input.timezone,
    status: 'scheduled',
    note: input.note ?? null,
    title: input.title,
  });
}

export async function cancelAppointment(store: Store, businessId: string, id: string) {
  const appt = await store.getAppointmentById(id);
  if (!appt || appt.businessId !== businessId) throw notFound('Appointment not found');
  return store.updateAppointment(id, { status: 'cancelled' });
}
