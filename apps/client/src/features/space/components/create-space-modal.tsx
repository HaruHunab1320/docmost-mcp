import { Button, Divider, Modal, ButtonProps } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CreateSpaceForm } from "@/features/space/components/create-space-form.tsx";
import { useTranslation } from "react-i18next";

interface CreateSpaceModalProps {
  buttonProps?: ButtonProps;
}

export default function CreateSpaceModal({ buttonProps }: CreateSpaceModalProps) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button onClick={open} {...buttonProps}>
        {t("Create space")}
      </Button>

      <Modal opened={opened} onClose={close} title={t("Create space")}>
        <Divider size="xs" mb="xs" />
        <CreateSpaceForm />
      </Modal>
    </>
  );
}
