import { EventBase, NEVENT_KIND, Report, NREPORT_KIND } from "../types";

/**
 * Extracts a report from an event
 * This will throw an error if event is not a report
 * https://github.com/nostr-protocol/nips/blob/master/56.md
 * @param event
 * @returns
 */
export function eventHasReport(event: EventBase): Report | undefined {
  if (event.kind !== NEVENT_KIND.REPORTING) {
    throw new Error(
      `Event is not a report: ${event.kind}. Expected ${NEVENT_KIND.REPORTING}.`
    );
  }

  const reportTag = event.tags.filter((tag) => tag[0] === "p");
  if (!reportTag || reportTag.length === 0) {
    return undefined;
  }

  // Try to find the event id
  // ["e", <eventId>, "illegal"],
  let eventId: string = undefined;
  const eventTag = event.tags.filter((tag) => tag[0] === "e");
  if (eventTag.length > 0 && eventTag[0].length > 0) {
    eventId = eventTag[0][1];
  }

  // Determne report tyoe from report tag
  // ["p", <pubkey>, "nudity"],
  // if that fails, try the event tag
  // ["e", <eventId>, "illegal"],
  let kind: NREPORT_KIND = undefined;
  if (reportTag[0].length === 3) {
    kind = reportTag[0][2] as NREPORT_KIND;
  } else if (eventTag.length > 0 && eventTag[0].length === 3) {
    kind = eventTag[0][2] as NREPORT_KIND;
  }

  // if kind is undefined, try the eventTag instead if that's at least 3 long
  // ["p", <pubkey>]
  let publicKey: string = undefined;
  if (reportTag[0].length > 0) {
    publicKey = reportTag[0][1];
  }

  if (!kind || !publicKey) {
    return undefined;
  }

  const report: Report = {
    eventId,
    kind,
    publicKey,
    content: event.content && event.content !== "" ? event.content : undefined,
  };

  return report;
}

export function generateReportTags(report: Report): string[][] {
  const { eventId, kind, publicKey } = report;
  if (!kind) {
    throw new Error("Report must have a kind.");
  }
  if (!publicKey) {
    throw new Error("Report must mention a public key.");
  }
  if (kind === NREPORT_KIND.IMPERSONATION && eventId) {
    throw new Error(
      "Impersonation reports should refer to a person, not an event."
    );
  }
  const tags: string[][] = [];
  if (eventId) {
    tags.push(["e", eventId, kind]);
    if (publicKey) {
      tags.push(["p", publicKey]);
    }
  } else {
    if (publicKey) {
      tags.push(["p", publicKey, kind]);
    }
  }

  return tags;
}
