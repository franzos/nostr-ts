import { NEvent } from "../classes";
import { EventBase, NEVENT_KIND } from "../types";
import { proofOfWork } from "./proof-of-work";

describe("Proof of Work Performance", () => {
  let sampleEvent: EventBase;

  beforeEach(() => {
    sampleEvent = {
      id: "e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466",
      pubkey:
        "5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70",
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
  });

  test("10 bits proof of work - event function", async () => {
    const ev = new NEvent(sampleEvent);
    const startTime = Date.now();
    ev.proofOfWork(10);
    const endTime = Date.now();
  });
});
