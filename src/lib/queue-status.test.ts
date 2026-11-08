import { describe, expect, it } from "vitest";
import en from "../locales/en/consult.json";
import fr from "../locales/fr/consult.json";
import rw from "../locales/rw/consult.json";
import { formatQueueLine, queueFacts, type QueueCopy } from "./queue-status";

function copyOf(bundle: {
  connect: { queue_position: string; queue_ahead_one: string; queue_ahead_other: string; queue_next: string };
}): QueueCopy {
  return {
    place: bundle.connect.queue_position,
    aheadOne: bundle.connect.queue_ahead_one,
    aheadOther: bundle.connect.queue_ahead_other,
    next: bundle.connect.queue_next,
  };
}

const english = copyOf(en);
const french = copyOf(fr);

describe("queue place and people ahead", () => {
  it("shows place 25 and 7 people ahead as different facts", () => {
    expect(queueFacts(25, 7)).toEqual({ place: 25, peopleAhead: 7, youAreNext: false });
    expect(formatQueueLine(25, 7, english)).toBe("Your place 25 · 7 people ahead");
    expect(formatQueueLine(25, 7, french)).toBe("Votre place 25 · 7 personnes devant vous");
    expect(formatQueueLine(25, 7, english)).not.toContain("Position 7");
    expect(formatQueueLine(25, 7, french)).not.toContain("Position 7");
  });

  it("does not call a missing ahead-count next when the place is already 8", () => {
    expect(queueFacts(8, null)).toEqual({ place: 8, peopleAhead: 7, youAreNext: false });
    expect(formatQueueLine(8, null, english)).toBe("Your place 8 · 7 people ahead");
    expect(formatQueueLine(1, 0, english)).toBe("Your place 1 · You're next");
    expect(formatQueueLine(1, 0, french)).toBe("Votre place 1 · Vous êtes le prochain");
  });

  it("keeps one person ahead singular in English and French", () => {
    expect(formatQueueLine(2, 1, english)).toBe("Your place 2 · 1 person ahead");
    expect(formatQueueLine(2, 1, french)).toBe("Votre place 2 · 1 personne devant vous");
    expect(formatQueueLine(3, 2, copyOf(rw))).toBe("Umwanya wawe 3 · 2 bakubanjirije");
  });
});
