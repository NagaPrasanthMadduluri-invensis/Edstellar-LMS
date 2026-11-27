import { describe, expect, it } from "vitest";
import {
  calendarEntries, dateChangeLabel, formatDateRange, formatSessionDates, isBookable, isMyBatch, pendingEntries,
  scheduleOf, seatsText, sittingsOf,
} from "./sittings";

const sitting = (over = {}) => ({
  batch_id: 1, batch_no: 1, name: "Batch 1", label: null,
  start_date: "2030-12-01", end_date: "2030-12-03",
  dates: ["2030-12-01", "2030-12-02", "2030-12-03"],
  start_time: "09:00", end_time: "12:00",
  capacity: 2, registered: 1, available: 1, is_full: false, waitlist: 0,
  status: "scheduled", trainer_name: null, total_minutes: null, ...over,
});

describe("formatDateRange", () => {
  it("reads one day, a run, a year end and no date", () => {
    expect(formatDateRange("2030-12-01", "2030-12-01")).toBe("1 Dec 2030");
    expect(formatDateRange("2030-12-01", "2030-12-03")).toBe("1 Dec to 3 Dec 2030");
    expect(formatDateRange("2030-12-30", "2031-01-02")).toBe("30 Dec 2030 to 2 Jan 2031");
    expect(formatDateRange(null, null)).toBe("Date to be set");
  });
});

describe("seatsText", () => {
  it("says seats left, Full, and who is waiting", () => {
    expect(seatsText(sitting())).toBe("1 / 2 · 1 seat left");
    expect(seatsText(sitting({ registered: 2, available: 0, is_full: true }))).toBe("2 / 2 · Full");
    expect(seatsText(sitting({ registered: 2, available: 0, is_full: true, waitlist: 3 }))).toBe("2 / 2 · Full · 3 waiting");
    expect(seatsText(sitting({ registered: null }))).toBe("");
  });
});

describe("calendarEntries", () => {
  it("places one entry per day and keeps same-day batches apart", () => {
    const s = { id: 7, title: "T", sittings: [sitting(), sitting({ batch_id: 2, dates: ["2030-12-02"], start_date: "2030-12-02", end_date: "2030-12-02" })] };
    const entries = calendarEntries([s]);
    expect(entries).toHaveLength(4);
    expect(entries.filter((e) => e.d === 2)).toHaveLength(2);
    expect(entries.find((e) => e.d === 3)).toMatchObject({ dayNo: 3, dayCount: 3 });
    expect(new Set(entries.map((e) => e.key)).size).toBe(4);
  });
  it("falls back to the old single date", () => {
    const s = { id: 1, title: "Old", date: "2030-05-04", start_time: "10:00", end_time: "11:00", capacity: 5, roster_count: 2 };
    expect(sittingsOf(s)).toHaveLength(1);
    expect(calendarEntries([s])).toHaveLength(1);
    expect(seatsText(sittingsOf(s)[0])).toBe("2 / 5 · 3 seats left");
  });
});

describe("pendingEntries, isMyBatch, isBookable", () => {
  it("names undated sittings", () => {
    const s = { id: 1, title: "P", sittings: [sitting({ status: "pending", dates: [], start_date: null, end_date: null })] };
    expect(pendingEntries([s])).toHaveLength(1);
    expect(calendarEntries([s])).toHaveLength(0);
  });
  it("matches the learner's own batch only for a batched sitting", () => {
    expect(isMyBatch({ my_batch_id: 1 }, sitting())).toBe(true);
    expect(isMyBatch({ my_batch_id: 2 }, sitting())).toBe(false);
    expect(isMyBatch({ my_batch_id: null }, sitting({ batch_id: null }))).toBe(false);
  });
  it("books only scheduled sittings with a start date", () => {
    expect(isBookable(sitting())).toBe(true);
    expect(isBookable(sitting({ status: "pending", start_date: null }))).toBe(false);
  });
});

describe("session dates (0076)", () => {
  it("writes dates the way the certificate does", () => {
    expect(formatSessionDates(["2026-12-02", "2026-11-05", "2026-11-06"])).toBe("5th, 6th November and 2nd December 2026");
    expect(formatSessionDates(["2026-12-31", "2027-01-02"])).toBe("31st December 2026 and 2nd January 2027");
    expect(formatSessionDates([])).toBe("");
  });
  it("a learner's batch is any of their per-date batches", () => {
    const s = { my_batch_ids: [4, 9] };
    expect(isMyBatch(s, sitting({ batch_id: 9 }))).toBe(true);
    expect(isMyBatch(s, sitting({ batch_id: 5 }))).toBe(false);
    expect(isMyBatch({ my_batch_id: 5 }, sitting({ batch_id: 5 }))).toBe(true);
  });
  it("labels changes and lists the schedule in order", () => {
    expect(dateChangeLabel("postponed")).toBe("Postponed");
    expect(dateChangeLabel("preponed")).toBe("Preponed");
    expect(dateChangeLabel(null)).toBe("");
    expect(scheduleOf({ sittings: [sitting({ dates: ["2030-12-03"] }), sitting({ dates: ["2030-12-01"] })] }).map((d) => d.date)).toEqual(["2030-12-01", "2030-12-03"]);
  });
  it("numbers calendar days by the session's dates", () => {
    const session = { id: 1, schedule: [{ date: "2030-12-01" }, { date: "2030-12-08", change: "postponed" }], sittings: [sitting({ dates: ["2030-12-01"] }), sitting({ batch_id: 2, dates: ["2030-12-08"] })] };
    const entries = calendarEntries([session]);
    expect(entries.map((e) => [e.date, e.dayNo, e.dayCount, e.change])).toEqual([["2030-12-01", 1, 2, null], ["2030-12-08", 2, 2, "postponed"]]);
  });
});

describe("planSchedule and datesInRange (0076)", () => {
  it("pairs removed and added dates as moves", async () => {
    const { planSchedule, datesInRange } = await import("./sittings");
    expect(planSchedule(["2030-11-05", "2030-11-06"], ["2030-11-05", "2030-11-13"]))
      .toEqual({ moves: [{ from: "2030-11-06", to: "2030-11-13", change: "postponed" }], added: [], removed: [] });
    expect(planSchedule(["2030-11-05"], ["2030-11-01", "2030-11-09"]))
      .toEqual({ moves: [{ from: "2030-11-05", to: "2030-11-01", change: "preponed" }], added: ["2030-11-09"], removed: [] });
    expect(datesInRange("2030-11-29", "2030-12-01")).toEqual(["2030-11-29", "2030-11-30", "2030-12-01"]);
    expect(datesInRange("2030-11-29", "")).toEqual(["2030-11-29"]);
  });
});
