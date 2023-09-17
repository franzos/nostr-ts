import { expose } from "comlink";
import { NWorker } from "@nostr-ts/web";

const worker = new NWorker({
  isInWebWorker: true,
});
expose(worker);
