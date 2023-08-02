/**
 * Check array of tags if any are NIP-14
 */
export function eventHasSubject(tags: string[][]): string | undefined {
  const subjectTags = tags.filter((tag) => tag[0] === "subject");
  if (subjectTags.length === 0) {
    return;
  }
  return subjectTags[0][1];
}

/**
 * Check if given subject is a response (starts with "Re:")
 *
 * @returns true if subject is a response
 */
export function subjectIsRespone(subject?: string): boolean {
  if (!subject) {
    return false;
  }
  return subject.startsWith("Re:");
}

/**
 * Make a subject response
 */
export function makeSubjectResponse(subject: string): string {
  if (subjectIsRespone(subject)) {
    return subject;
  }
  return `Re: ${subject}`;
}
