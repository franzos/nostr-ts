export function isValidWebSocketUrl(url: string): boolean {
  const regex = /^wss:\/\/[a-zA-Z0-9.-]*$/;
  return regex.test(url);
}
