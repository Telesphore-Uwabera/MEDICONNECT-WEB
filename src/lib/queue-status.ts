import enConsult from "../locales/en/consult.json";
import frConsult from "../locales/fr/consult.json";
import rwConsult from "../locales/rw/consult.json";

/**
 * Patient queue line.
 *
 * `placeInQueue` and the patient list both set `people_ahead` to
 * `queue_position - 1` on every response. The create body also returns the
 * raw row as `data`. Reading `queue_position` from the top level and
 * `people_ahead` from that row can pair a fresh place with a stored column.
 * This helper reads one object only. A pair that is not exactly one apart is
 * not shown; the status poll replaces that line when the next response agrees.
 * The first place is 1 and 0, and that line is only the next sentence.
 */
export type QueueCopy = {
  next: string;
  waitingOne: string;
  waitingOther: string;
  unknown: string;
};

export type QueueFields = {
  position: unknown;
  ahead: unknown;
};

type QueueBundle = {
  connect: {
    queue_next: string;
    queue_waiting_one: string;
    queue_waiting_other: string;
    queue_unknown: string;
  };
};

function bundleCopy(bundle: QueueBundle): QueueCopy {
  return {
    next: bundle.connect.queue_next,
    waitingOne: bundle.connect.queue_waiting_one,
    waitingOther: bundle.connect.queue_waiting_other,
    unknown: bundle.connect.queue_unknown,
  };
}

const COPIES = {
  en: bundleCopy(enConsult),
  fr: bundleCopy(frConsult),
  rw: bundleCopy(rwConsult),
};

export function queueCopy(language: string | null | undefined): QueueCopy {
  const code = String(language || "").toLowerCase();
  if (code.startsWith("fr")) return COPIES.fr;
  if (code.startsWith("rw")) return COPIES.rw;
  return COPIES.en;
}

function hasValue(value: unknown): boolean {
  return value != null && value !== "";
}

/** One source. A missing ahead count stays missing; it is not filled from another object. */
export function readQueueFields(
  primary: { queue_position?: unknown; people_ahead?: unknown } | null | undefined,
  fallback?: { queue_position?: unknown; people_ahead?: unknown } | null,
): QueueFields {
  if (hasValue(primary?.queue_position) || hasValue(primary?.people_ahead)) {
    return {
      position: hasValue(primary?.queue_position) ? primary?.queue_position : null,
      ahead: hasValue(primary?.people_ahead) ? primary?.people_ahead : null,
    };
  }
  return {
    position: fallback?.queue_position ?? null,
    ahead: fallback?.people_ahead ?? null,
  };
}

function fill(template: string, values: Record<string, number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function formatQueueLine(position: unknown, ahead: unknown, copy: QueueCopy): string {
  const parsedPlace = Number(position);
  if (!Number.isFinite(parsedPlace) || parsedPlace < 1) return copy.unknown;
  const place = Math.floor(parsedPlace);
  let peopleAhead = place - 1;
  if (hasValue(ahead)) {
    const parsedAhead = Number(ahead);
    if (!Number.isFinite(parsedAhead) || Math.floor(parsedAhead) !== place - 1) return copy.unknown;
    peopleAhead = place - 1;
  }
  if (place === 1 && peopleAhead === 0) return copy.next;
  return fill(peopleAhead === 1 ? copy.waitingOne : copy.waitingOther, { position: place, count: peopleAhead });
}
