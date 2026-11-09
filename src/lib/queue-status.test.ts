import { describe, expect, it } from "vitest";
import en from "../locales/en/consult.json";
import fr from "../locales/fr/consult.json";
import { formatQueueLine, queueCopy, readQueueFields } from "./queue-status";

const english = queueCopy("en");
const french = queueCopy("fr");

describe("queue place line", () => {
  it("shows the current first place as next, and a later place as that one pair", () => {
    expect(formatQueueLine(1, 0, english)).toBe("You're next");
    expect(formatQueueLine(1, null, english)).toBe("You're next");
    expect(formatQueueLine(1, 0, french)).toBe("Vous êtes le prochain");
    expect(formatQueueLine(8, 7, english)).toBe("Your place 8, 7 people ahead");
    expect(formatQueueLine(8, null, english)).toBe("Your place 8, 7 people ahead");
    expect(formatQueueLine(2, 1, french)).toBe("Votre place 2, 1 personne devant vous");
    expect(en.connect.queue_next).toBe("You're next");
    expect(fr.connect.queue_next).toBe("Vous êtes le prochain");
  });

  it("does not print a pair that is not one apart", () => {
    const line = formatQueueLine(25, 7, english);
    expect(line).toBe("Checking your place");
    expect(line).not.toMatch(/\d/);
    expect(formatQueueLine(25, 7, french)).toBe("Vérification de votre place");
    expect(formatQueueLine(1, 4, english)).toBe("Checking your place");
  });

  it("does not pair a top-level place with people_ahead from the raw row", () => {
    const fields = readQueueFields(
      { queue_position: 8 },
      { queue_position: 25, people_ahead: 7 },
    );
    expect(fields).toEqual({ position: 8, ahead: null });
    expect(formatQueueLine(fields.position, fields.ahead, english)).toBe("Your place 8, 7 people ahead");
    const staleOnly = readQueueFields(null, { queue_position: 3, people_ahead: 2 });
    expect(formatQueueLine(staleOnly.position, staleOnly.ahead, english)).toBe("Your place 3, 2 people ahead");
  });
});
