const APP_ROUTE = {
  HOME: "/home",
  FILES: "/files",
  SPACE: {
    HOME: (spaceSlug: string) => `/s/${spaceSlug}/home`,
    PROJECTS: (spaceId: string) => `/s/${spaceId}/projects`,
    PAGE: (spaceSlug: string, pageSlug: string) =>
      `/s/${spaceSlug}/p/${pageSlug}`,
    TASKS: (spaceId: string) => `/spaces/${spaceId}/tasks`,
    INBOX: (spaceId: string) => `/spaces/${spaceId}/inbox`,
    TODAY: (spaceId: string) => `/spaces/${spaceId}/today`,
    TRIAGE: (spaceId: string) => `/spaces/${spaceId}/triage`,
    REVIEW: (spaceId: string) => `/spaces/${spaceId}/review`,
    WAITING: (spaceId: string) => `/spaces/${spaceId}/waiting`,
    SOMEDAY: (spaceId: string) => `/spaces/${spaceId}/someday`,
    INSIGHTS: (spaceId: string) => `/spaces/${spaceId}/insights`,
  },
  AUTH: {
    LOGIN: "/login",
    SIGNUP: "/signup",
    SETUP: "/setup/register",
    FORGOT_PASSWORD: "/forgot-password",
    PASSWORD_RESET: "/password-reset",
    CREATE_WORKSPACE: "/create",
    SELECT_WORKSPACE: "/select",
  },
  SETTINGS: {
    ACCOUNT: {
      PROFILE: "/settings/account/profile",
      PREFERENCES: "/settings/account/preferences",
    },
    WORKSPACE: {
      GENERAL: "/settings/workspace",
      MEMBERS: "/settings/members",
      GROUPS: "/settings/groups",
      SPACES: "/settings/spaces",
      API_KEYS: "/settings/api-keys",
      BILLING: "/settings/billing",
      SECURITY: "/settings/security",
    },
  },
};

export default APP_ROUTE;
