import { Container, Space } from "@mantine/core";
import HomeTabs from "@/features/home/components/home-tabs";
import SpaceGrid from "@/features/space/components/space-grid.tsx";
import { getAppName } from "@/lib/config.ts";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { MCPEventIndicator } from "@/features/websocket/components/mcp-event-indicator";
import { MCPEventDebugger } from "@/features/websocket/components/mcp-event-debugger";

export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>
          {t("Home")} - {getAppName()}
        </title>
      </Helmet>
      <Container size={"800"} pt="xl">
        <SpaceGrid />

        <Space h="xl" />

        <HomeTabs />

        {/* <MCPEventIndicator />
        <MCPEventDebugger /> */}
      </Container>
    </>
  );
}
