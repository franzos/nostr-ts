import { proofOfWork } from "@nostr-ts/common";

self.onmessage = function (e) {
  const data = e.data;
  const result = proofOfWork(data.event, data.bits);
  self.postMessage({ result });
};
