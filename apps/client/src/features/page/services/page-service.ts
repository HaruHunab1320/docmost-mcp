import api from "@/lib/api-client";
import { extractPageSlugId } from "@/lib";
import {
  IExportPageParams,
  IMovePage,
  IMovePageToSpace,
  IPage,
  IPageInput,
  SidebarPagesParams,
  ExportFormat,
} from "@/features/page/types/page.types";
import { IAttachment, IPagination } from "@/lib/types.ts";
import { saveAs } from "file-saver";
import { notifications } from "@mantine/notifications";
import { generatePdfFilename } from "@/lib/pdf-export";
import html2pdf from "html2pdf.js";

export async function createPage(data: Partial<IPage>): Promise<IPage> {
  const req = await api.post<IPage>("/pages/create", data);
  return req.data;
}

export async function getPageById(
  pageInput: Partial<IPageInput>
): Promise<IPage> {
  const pageId = pageInput.pageId
    ? extractPageSlugId(pageInput.pageId)
    : pageInput.pageId;
  const req = await api.post<IPage>("/pages/info", { ...pageInput, pageId });
  return req.data;
}

export async function updatePage(data: Partial<IPageInput>): Promise<IPage> {
  const req = await api.post<IPage>("/pages/update", data);
  return req.data;
}

export async function deletePage(pageId: string): Promise<void> {
  await api.post("/pages/delete", { pageId });
}

export async function movePage(data: IMovePage): Promise<void> {
  await api.post<void>("/pages/move", data);
}

export async function movePageToSpace(data: IMovePageToSpace): Promise<void> {
  await api.post<void>("/pages/move-to-space", data);
}

export async function getSidebarPages(
  params: SidebarPagesParams
): Promise<IPagination<IPage>> {
  const req = await api.post("/pages/sidebar-pages", params);
  return req.data;
}

export async function getPageBreadcrumbs(
  pageId: string
): Promise<Partial<IPage[]>> {
  const req = await api.post("/pages/breadcrumbs", { pageId });
  return req.data;
}

export async function getRecentChanges(
  spaceId?: string
): Promise<IPagination<IPage>> {
  const req = await api.post("/pages/recent", { spaceId });
  return req.data;
}

export async function exportPage(data: IExportPageParams): Promise<void> {
  // For PDF format with no child pages, use direct PDF generation
  if (data.format === ExportFormat.PDF && !data.includeChildren) {
    try {
      // First, get the HTML content using the same API endpoint
      const req = await api.post(
        "/pages/export",
        {
          ...data,
          format: ExportFormat.HTML, // Get as HTML first
        },
        {
          responseType: "blob",
        }
      );

      // Convert the blob to text
      const htmlContent = await req.data.text();

      // Get page info for better title
      const pageInfo = await getPageById({ pageId: data.pageId });
      const title = pageInfo?.title || data.pageId;
      const filename = generatePdfFilename(title);

      // Create a temporary div to hold the HTML content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlContent;

      // Add CSS to improve page breaks
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        @page {
          margin: 15mm;
          size: A4;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.5;
          font-size: 11pt;
        }
        p, div, span, li {
          page-break-inside: avoid;
          word-wrap: break-word;
        }
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          page-break-inside: avoid;
        }
        img, table {
          page-break-inside: avoid;
        }
        td, th {
          word-break: break-word;
        }
      `;
      tempDiv.appendChild(styleElement);
      document.body.appendChild(tempDiv);

      // Configure options for html2pdf
      const options = {
        margin: [15, 15, 15, 15], // [top, right, bottom, left] in mm
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
          precision: 4,
          floatPrecision: "smart",
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          avoid: ["tr", "td", "div", "p", "span", "img", "pre", "code"],
        },
      };

      // Generate and download PDF directly
      html2pdf()
        .from(tempDiv)
        .set(options)
        .save()
        .then(() => {
          // Remove the temporary div after PDF generation
          document.body.removeChild(tempDiv);

          notifications.show({
            title: "PDF Export",
            message: "Your PDF has been downloaded successfully",
            color: "green",
          });
        });

      return;
    } catch (err) {
      notifications.show({
        message: "PDF Export failed",
        color: "red",
      });
      console.error("PDF export error", err);
      return;
    }
  }

  // For other formats (HTML, Markdown) or PDF with includeChildren
  // Just download the file directly from the server
  const req = await api.post("/pages/export", data, {
    responseType: "blob",
  });

  const fileName =
    req?.headers["content-disposition"]
      ?.split("filename=")[1]
      ?.replace(/"/g, "") || "export.zip";

  // For PDF with includeChildren, the file will be a ZIP
  saveAs(req.data, decodeURIComponent(fileName));
}

export async function importPage(file: File, spaceId: string) {
  const formData = new FormData();
  formData.append("spaceId", spaceId);
  formData.append("file", file);

  const req = await api.post<IPage>("/pages/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return req.data;
}

export async function uploadFile(
  file: File,
  pageId: string,
  attachmentId?: string
): Promise<IAttachment> {
  const formData = new FormData();
  if (attachmentId) {
    formData.append("attachmentId", attachmentId);
  }
  formData.append("pageId", pageId);
  formData.append("file", file);

  const req = await api.post<IAttachment>("/files/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return req as unknown as IAttachment;
}
