# Token Refresh Error Troubleshooting Guide

## What the Error Means

The error "Token has been expired or revoked" indicates that your Google OAuth refresh tokens have expired or been invalidated, preventing the app from automatically refreshing your access tokens.

## Immediate Fix

1. **Sign Out**: Click the hamburger menu (☰) in the top-right corner and select "Sign Out"
2. **Clear Browser Cache**: Clear your browser's cache and cookies for this site (optional but recommended)
3. **Sign Back In**: Click "Sign in with Google" to get fresh tokens
4. **Grant ALL Permissions**: Make sure to grant ALL requested permissions, especially Calendar access
5. **Check Console**: If sign-in still fails, check browser console and server logs for detailed errors

## OAuth Scope Issues

If you see "Request had insufficient authentication scopes" errors:

- The app now requests these Google permissions:
  - Basic profile (openid, email, profile)
  - Full Calendar access (`https://www.googleapis.com/auth/calendar`)
  - Calendar Events access (`https://www.googleapis.com/auth/calendar.events`)
- You must grant ALL permissions during sign-in
- If you previously denied calendar access, you need to revoke app permissions and re-authorize

## Revoking App Permissions (if needed)

1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "Calbrew" in the list
3. Click "Remove Access"
4. Return to the app and sign in again
5. This time, grant ALL requested permissions

## Why This Happens

- Google refresh tokens expire after 6 months of inactivity (for non-verified apps)
- User changed their Google account password
- User manually revoked app permissions in Google Account settings
- Too many refresh tokens were issued (Google limits the number of active tokens)

## Prevention

The app now includes:

- **Better Error Logging**: More detailed error information in server logs
- **Automatic Sign-Out**: When tokens expire, you'll be automatically signed out instead of seeing errors
- **Session Monitoring**: Regular token validity checks
- **Graceful Degradation**: Better handling of authentication failures

## Long-term Solution

Consider applying for Google OAuth verification to:

- Remove the 6-month token expiry limit
- Show verified app badge to users
- Reduce token refresh failures

## Development Notes

- Refresh tokens are more likely to expire during development due to frequent changes
- Consider using a dedicated Google project for production vs development
- Monitor server logs for detailed OAuth error information

## If Problems Persist

1. Check Google Cloud Console for OAuth client configuration
2. Verify redirect URIs are correctly configured
3. Check server logs for detailed error messages
4. Consider revoking app access in Google Account settings and re-authorizing

## Files Modified for Better Error Handling

- `src/lib/auth.ts` - Enhanced token refresh error logging
- `src/app/providers.tsx` - Added session monitoring
- `src/app/page.tsx` - Automatic sign-out on token errors
- `src/types/next-auth.d.ts` - Added error type definitions
