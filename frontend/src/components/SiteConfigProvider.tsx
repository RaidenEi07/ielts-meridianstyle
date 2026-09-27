"use client";

import { createContext, useContext, useState } from "react";
import { SITE_DEFAULTS, type SiteConfig } from "@/lib/siteConfig";

const SiteConfigContext = createContext<SiteConfig>(SITE_DEFAULTS);
const SetSiteConfigContext = createContext<(config: SiteConfig) => void>(() => {});

/**
 * Tên, logo, email của trung tâm cho mọi component phía client. Giá trị đầu do layout đọc từ backend ở
 * server nên HTML đầu tiên đã đúng tên/logo (không nháy tên mặc định); trang Cấu hình cập nhật lại sau khi lưu.
 */
export function SiteConfigProvider({
  initial,
  children,
}: {
  initial: SiteConfig;
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState(initial);
  return (
    <SetSiteConfigContext.Provider value={setConfig}>
      <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>
    </SetSiteConfigContext.Provider>
  );
}

export const useSiteConfig = () => useContext(SiteConfigContext);
export const useSetSiteConfig = () => useContext(SetSiteConfigContext);
