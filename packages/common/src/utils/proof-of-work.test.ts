import { NEvent } from "../classes";
import { EventBase, NEVENT_KIND } from "../types";
import { proofOfWork } from "./proof-of-work";

describe("Proof of Work Performance", () => {
  let sampleEvent: EventBase;

  beforeEach(() => {
    sampleEvent = {
      id: "",
      pubkey: "samplePublicKey",
      created_at: Math.floor(Date.now() / 1000),
      kind: NEVENT_KIND.SHORT_TEXT_NOTE, // or any other value you want
      tags: [],
      content: "Test content",
      sig: "sampleSignature",
    };
  });

  test("10 bits proof of work", async () => {
    const startTime = Date.now();
    proofOfWork(sampleEvent, 10);
    const endTime = Date.now();

    console.log(`10 bits proof of work took ${endTime - startTime} ms`);
  });

  test("10 bits proof of work - event function", async () => {
    const ev = new NEvent(sampleEvent);
    const startTime = Date.now();
    ev.proofOfWork(10);
    const endTime = Date.now();

    console.log(
      `10 bits proof of work took ${endTime - startTime} ms  - event function`
    );
  });
});
