// Client-side session management
const SESSION_KEY = "research_session_token";

export function getSessionToken(): string {
  // Only run in browser
  if (typeof window === "undefined") {
    return "";
  }

  let token = localStorage.getItem(SESSION_KEY);

  if (!token) {
    // Generate new UUID
    token = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, token);
  }

  return token;
}

export function clearSessionToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}
