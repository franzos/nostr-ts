import { Agent } from "https";
import type { Response } from "node-fetch";

export async function makeRequest(
  url: string,
  headers?: any,
  options?: {
    rejectUnauthorized?: boolean;
  }
) {
  try {
    const fetch = (await import("node-fetch")).default;
    const agent =
      options && options.rejectUnauthorized === false
        ? new Agent({
            rejectUnauthorized: false,
          })
        : undefined;

    let response = (await Promise.race([
      fetch(url, {
        headers,
        agent,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      ),
    ])) as Response;

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Error making request: ${error}`);
  }
}
