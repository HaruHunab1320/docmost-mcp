import { UserProvider } from "@/features/user/user-provider.tsx";
import { Outlet, useLocation } from "react-router-dom";
import GlobalAppShell from "@/components/layouts/global/global-app-shell.tsx";

export default function Layout() {
  const location = useLocation();

  return (
    <UserProvider>
      <GlobalAppShell>
        <Outlet key={location.pathname} />
      </GlobalAppShell>
    </UserProvider>
  );
}
