import type { SidebarBadges } from "@paperclipai/shared";
import { api } from "./client";

interface SidebarBadgeStateOptions {
  dismissedKeys?: Iterable<string>;
  readKeys?: Iterable<string>;
}

export const sidebarBadgesApi = {
  get: (companyId: string, options?: SidebarBadgeStateOptions) => {
    const params = new URLSearchParams();
    for (const key of options?.dismissedKeys ?? []) params.append("dismissed", key);
    for (const key of options?.readKeys ?? []) params.append("read", key);
    const suffix = params.toString();
    return api.get<SidebarBadges>(
      `/companies/${companyId}/sidebar-badges${suffix ? `?${suffix}` : ""}`,
    );
  },
};
