export function setAuthCookies(role: "management" | "tenant", tenantId?: string) {
  // Basic, not secure, but fine for internal use while building
  document.cookie = `role=${role}; path=/; max-age=86400`; // 1 day

  if (role === "tenant" && tenantId) {
    document.cookie = `tenantId=${tenantId}; path=/; max-age=86400`;
  }

  if (role === "management") {
    // Remove any old tenantId cookie
    document.cookie = `tenantId=; path=/; max-age=0`;
  }
}
