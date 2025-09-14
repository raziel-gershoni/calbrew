import { signOut, signIn } from 'next-auth/react';
import { useCallback } from 'react';

/**
 * Hook to handle automatic re-authentication when user is not found in database
 */
export function useAutoReauth() {
  const handleApiResponse = useCallback(async (response: Response) => {
    if (!response.ok && response.status === 401) {
      try {
        const errorData = await response.json();

        // Check if this is specifically a "user not found" error
        if (errorData.code === 'USER_NOT_FOUND_PLEASE_REAUTH') {
          console.log(
            'User not found in database, forcing re-authentication...',
          );

          // Sign out and immediately sign back in to recreate user
          await signOut({ redirect: false });
          await signIn('google', {
            redirect: false,
            callbackUrl: window.location.pathname,
          });

          return true; // Indicates that re-auth was triggered
        }
      } catch (error) {
        console.error('Error parsing response for re-auth check:', error);
      }
    }

    return false; // No re-auth needed
  }, []);

  const apiCall = useCallback(
    async (url: string, options?: RequestInit) => {
      const response = await fetch(url, options);

      // Check if re-auth is needed
      const reAuthTriggered = await handleApiResponse(response);

      if (reAuthTriggered) {
        // Wait a bit for re-auth to complete, then retry the original request
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fetch(url, options);
      }

      return response;
    },
    [handleApiResponse],
  );

  return { apiCall, handleApiResponse };
}
