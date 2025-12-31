import PageHeaderMenu from "@/features/page/components/header/page-header-menu.tsx";
import Breadcrumb from "@/features/page/components/breadcrumbs/breadcrumb.tsx";
import { BreadcrumbBar } from "@/features/page/components/breadcrumbs/breadcrumb-bar";

interface Props {
  readOnly?: boolean;
}
export default function PageHeader({ readOnly }: Props) {
  return (
    <BreadcrumbBar right={<PageHeaderMenu readOnly={readOnly} />}>
      <Breadcrumb />
    </BreadcrumbBar>
  );
}
