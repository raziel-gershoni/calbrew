/**
 * Admin utility for checking admin access via ADMIN_EMAILS env var
 */

/**
 * Check if the given email is an admin.
 * Reads from the ADMIN_EMAILS environment variable (comma-separated list).
 * Case-insensitive comparison.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) {
    return false;
  }

  const adminList = adminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminList.includes(email.toLowerCase());
}
