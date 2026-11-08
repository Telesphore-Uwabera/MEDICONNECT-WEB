import enConsult from "../locales/en/consult.json";
import frConsult from "../locales/fr/consult.json";
import rwConsult from "../locales/rw/consult.json";

/**
 * Patient-facing queue copy.
 *
 * `queue_position` is the 1-based arrival place for this doctor's open
 * requests (earlier created_at, then lower id). `people_ahead` is how many
 * of those requests are in front. A stored payload can carry both, and they
 * are not required to be one apart: the live status that showed "Position 7"
 * had people_ahead 7 and queue_position 25. The place label uses only
 * queue_position. Missing people_ahead is derived as place - 1, and that
 * missing value is not "you are next" unless the place is 1.
 */
export type QueueCopy = {
  place: string;
  aheadOne: string;
  aheadOther: string;
  next: string;
};

export type QueueFacts = {
  place: number;
  peopleAhead: number;
  youAreNext: boolean;
};

export function queueFacts(position: unknown, ahead: unknown): QueueFacts {
  const parsedPlace = Number(position);
  const place = Number.isFinite(parsedPlace) && parsedPlace >= 1 ? Math.floor(parsedPlace) : 1;
  let peopleAhead: number;
  if (ahead == null || ahead === "") {
    peopleAhead = Math.max(0, place - 1);
  } else {
    const parsedAhead = Number(ahead);
    peopleAhead = Number.isFinite(parsedAhead) ? Math.max(0, Math.floor(parsedAhead)) : 0;
  }
  return {
    place,
    peopleAhead,
    youAreNext: place === 1 && peopleAhead === 0,
  };
}

function fill(template: string, values: Record<string, number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

function bundleCopy(bundle: {
  connect: { queue_position: string; queue_ahead_one: string; queue_ahead_other: string; queue_next: string };
}): QueueCopy {
  return {
    place: bundle.connect.queue_position,
    aheadOne: bundle.connect.queue_ahead_one,
    aheadOther: bundle.connect.queue_ahead_other,
    next: bundle.connect.queue_next,
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

export function formatQueueLine(position: unknown, ahead: unknown, copy: QueueCopy): string {
  const facts = queueFacts(position, ahead);
  const placeText = fill(copy.place, { position: facts.place });
  const tail = facts.youAreNext
    ? copy.next
    : fill(facts.peopleAhead === 1 ? copy.aheadOne : copy.aheadOther, { count: facts.peopleAhead });
  return `${placeText} · ${tail}`;
}
