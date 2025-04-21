const APP_ROUTE = {
  HOME: "/home",
  FILES: "/files",
  SPACE: {
    HOME: (spaceSlug: string) => `/s/${spaceSlug}/home`,
    PROJECTS: (spaceId: string) => `/s/${spaceId}/projects`,
    PAGE: (spaceSlug: string, pageSlug: string) =>
      `/s/${spaceSlug}/p/${pageSlug}`,
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
      BILLING: "/settings/billing",
      SECURITY: "/settings/security",
    },
  },
};

export default APP_ROUTE;
