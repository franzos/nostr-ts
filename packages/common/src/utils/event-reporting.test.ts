import { EventReport, NREPORT_KIND } from "../types";
import { NEvent } from "../classes";
import { eventHasReport, generateReportTags } from "./event-reporting";

test("eventHasReport", () => {
  const ev = new NEvent({
    kind: 1984,
    content: "Broke local law",
    tags: [
      [
        "e",
        "1234567890123456789012345678901234567890123456789012345678901234",
        "illegal",
      ],
      ["p", "1234567890123456789012345678901234567890123456789012345678901234"],
    ],
  });
  const hasReport = eventHasReport(ev);
  expect(hasReport).toEqual({
    eventId: "1234567890123456789012345678901234567890123456789012345678901234",
    kind: "illegal",
    publicKey:
      "1234567890123456789012345678901234567890123456789012345678901234",
    content: "Broke local law",
  });
  expect(hasReport).toEqual(ev.hasReportTags());
});

test("eventHasReport: impersonation", () => {
  const ev = new NEvent({
    kind: 1984,
    content:
      "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234",
    tags: [
      [
        "p",
        "1234567890123456789012345678901234567890123456789012345678901234",
        "impersonation",
      ],
    ],
  });
  const hasReport = eventHasReport(ev);
  expect(hasReport).toEqual({
    kind: "impersonation",
    publicKey:
      "1234567890123456789012345678901234567890123456789012345678901234",
    content:
      "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234",
  });
  expect(hasReport).toEqual(ev.hasReportTags());
});

test("generateReportTags: impersonation", () => {
  const report: EventReport = {
    kind: NREPORT_KIND.IMPERSONATION,
    publicKey:
      "1234567890123456789012345678901234567890123456789012345678901234",
  };
  const tags = generateReportTags(report);
  expect(tags).toEqual([["p", report.publicKey, report.kind]]);
});

test("generateReportTags: event", () => {
  const report: EventReport = {
    kind: NREPORT_KIND.ILLEGAL,
    publicKey:
      "1234567890123456789012345678901234567890123456789012345678901234",
    eventId: "1234567890123456789012345678901234567890123456789012345678901234",
  };
  const tags = generateReportTags(report);
  expect(tags).toEqual([
    ["e", report.eventId, report.kind],
    ["p", report.publicKey],
  ]);
});
