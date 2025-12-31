import React, { useState } from "react";
import {
  Card,
  Title,
  TextInput,
  Group,
  Select,
  Button,
  Box,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import AttachmentList from "../components/attachment-list";
import { useLocation, useNavigate } from "react-router-dom";
import { IconSearch } from "@tabler/icons-react";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";

export default function AttachmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse query parameters
  const searchParams = new URLSearchParams(location.search);
  const spaceId = searchParams.get("spaceId") || undefined;
  const pageId = searchParams.get("pageId") || undefined;
  const queryParam = searchParams.get("query") || "";
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId);
  const { data: spacesData, isLoading: isSpacesLoading } =
    useGetSpacesQuery({ limit: 200 });

  // Handle search
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedSpaceId) params.append("spaceId", selectedSpaceId);
    if (searchQuery.trim()) params.append("query", searchQuery.trim());
    navigate({ search: params.toString() });
  };

  // Handle clearing filters
  const handleClearFilters = () => {
    setSelectedSpaceId(undefined);
    setSearchQuery("");
    navigate({ search: "" });
  };

  return (
    <Box p="md">
      <Title order={2} mb="md">
        {t("File Attachments")}
      </Title>

      <Card withBorder mb="md">
        <Group align="flex-end" mb="md">
          <TextInput
            label={t("Search files")}
            placeholder={t("Search by filename or type...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flexGrow: 1 }}
          />

          <Select
            label={t("Space")}
            placeholder={t("All spaces")}
            data={
              spacesData?.items?.map((space) => ({
                value: space.id,
                label: space.name,
              })) || []
            }
            value={selectedSpaceId}
            onChange={setSelectedSpaceId}
            clearable
            searchable
            disabled={isSpacesLoading}
          />

          <Button onClick={handleSearch}>{t("Search")}</Button>
          <Button variant="subtle" onClick={handleClearFilters}>
            {t("Clear Filters")}
          </Button>
        </Group>
      </Card>

      <Card withBorder>
        <AttachmentList spaceId={selectedSpaceId} pageId={pageId} query={queryParam} />
      </Card>
    </Box>
  );
}
