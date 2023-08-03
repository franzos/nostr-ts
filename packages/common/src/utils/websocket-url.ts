export function isValidWebSocketUrl(url: string): boolean {
  const regex = /^(wss?):\/\/([a-zA-Z0-9.-]+)(:\d+)?(\/[a-zA-Z0-9_/.-]*)?$/;
  return regex.test(url);
}
