export function excerpt(text: string, length: number) {
  if (text.length <= length) return text;
  return text ? text.substring(0, length) + "..." : "...";
}
