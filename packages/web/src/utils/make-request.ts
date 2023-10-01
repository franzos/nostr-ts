export async function makeRequest(
  url: string,
  options?: {
    headers?: any;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
  }
) {
  try {
    let response = (await Promise.race([
      fetch(url, {
        headers: options ? options?.headers : undefined,
        method: options ? options?.method : "GET",
        body: options ? options?.body : undefined,
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
