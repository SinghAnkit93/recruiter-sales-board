import { describe, expect, it } from "vitest";
import { followUpStatus, summarize } from "./pipeline";

const today = "2026-11-23";

describe("follow-up status", () => {
  it("flags an open deal with a past follow-up date as overdue", () => {
    expect(followUpStatus({ stage: "contacted", follow_up_date: "2026-11-22" }, today)).toBe(
      "overdue",
    );
  });

  it("marks a follow-up dated today as due today", () => {
    expect(followUpStatus({ stage: "proposal", follow_up_date: today }, today)).toBe("today");
  });

  it("ignores follow-ups on won or lost deals", () => {
    expect(followUpStatus({ stage: "won", follow_up_date: "2026-11-01" }, today)).toBe("none");
    expect(followUpStatus({ stage: "lost", follow_up_date: "2026-11-01" }, today)).toBe("none");
  });
});

describe("pipeline summary", () => {
  const deals = [
    { stage: "lead", value: 100000, follow_up_date: "2026-11-20" },
    { stage: "proposal", value: 400000, follow_up_date: today },
    { stage: "won", value: 700000, follow_up_date: "2026-11-01" },
    { stage: "lost", value: 50000, follow_up_date: null },
  ];

  it("counts only open deals in the open pipeline value", () => {
    expect(summarize(deals, today).openValue).toBe(500000);
  });

  it("totals won deal value separately", () => {
    expect(summarize(deals, today).wonValue).toBe(700000);
  });

  it("counts overdue and due-today follow-ups on open deals", () => {
    expect(summarize(deals, today).dueCount).toBe(2);
  });

  it("calculates win rate from closed deals only", () => {
    expect(summarize(deals, today).winRate).toBe(50);
  });
});
