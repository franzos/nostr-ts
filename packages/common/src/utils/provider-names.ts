/**
 * Check whether the provider name is valid.
 *
 * @param {string} name - The provider name to check.
 * @returns {boolean} - Whether the provider name is valid.
 */
export function isValidProviderName(name: string): boolean {
  const regex = /^[a-z0-9\.\-_\/@]*$/;
  return regex.test(name);
}

/**
 * Normalize the provider name by replacing uppercase letters with lowercase letters.
 * @param {string} name - The provider name to normalize.
 * @returns {string} - The normalized provider name.
 */
export function normalizeProviderName(name: string): string {
  return name.toLowerCase();
}
