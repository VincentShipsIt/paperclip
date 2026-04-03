import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accessApi } from "../api/access";
import { ApiError } from "../api/client";
import { approvalsApi } from "../api/approvals";
import { dashboardApi } from "../api/dashboard";
import { heartbeatsApi } from "../api/heartbeats";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import {
  computeInboxBadgeData,
  DISMISSED_ITEMS_UPDATED_EVENT,
  getRecentTouchedIssues,
  loadDismissedInboxItems,
  saveDismissedInboxItems,
  loadReadInboxItems,
  READ_ITEMS_UPDATED_EVENT,
  saveReadInboxItems,
  READ_ITEMS_KEY,
} from "../lib/inbox";

const INBOX_ISSUE_STATUSES = "backlog,todo,in_progress,in_review,blocked,done";

export function useDismissedInboxItems() {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissedInboxItems);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "paperclip:inbox:dismissed") return;
      setDismissed(loadDismissedInboxItems());
    };
    const handleLocalUpdate = () => {
      setDismissed(loadDismissedInboxItems());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(DISMISSED_ITEMS_UPDATED_EVENT, handleLocalUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DISMISSED_ITEMS_UPDATED_EVENT, handleLocalUpdate);
    };
  }, []);

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissedInboxItems(next);
      return next;
    });
  };

  return { dismissed, dismiss };
}

export function useReadInboxItems() {
  const [readItems, setReadItems] = useState<Set<string>>(loadReadInboxItems);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== READ_ITEMS_KEY) return;
      setReadItems(loadReadInboxItems());
    };
    const handleLocalUpdate = () => {
      setReadItems(loadReadInboxItems());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(READ_ITEMS_UPDATED_EVENT, handleLocalUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(READ_ITEMS_UPDATED_EVENT, handleLocalUpdate);
    };
  }, []);

  const markRead = (id: string) => {
    setReadItems((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadInboxItems(next);
      return next;
    });
  };

  const markUnread = (id: string) => {
    setReadItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      saveReadInboxItems(next);
      return next;
    });
  };

  return { readItems, markRead, markUnread };
}

export function useInboxBadge(companyId: string | null | undefined) {
  const { dismissed } = useDismissedInboxItems();
  const { readItems } = useReadInboxItems();

  const { data: approvals = [] } = useQuery({
    queryKey: queryKeys.approvals.list(companyId!),
    queryFn: () => approvalsApi.list(companyId!),
    enabled: !!companyId,
  });

  const { data: joinRequests = [] } = useQuery({
    queryKey: queryKeys.access.joinRequests(companyId!),
    queryFn: async () => {
      try {
        return await accessApi.listJoinRequests(companyId!, "pending_approval");
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return [];
        }
        throw err;
      }
    },
    enabled: !!companyId,
    retry: false,
  });

  const { data: dashboard } = useQuery({
    queryKey: queryKeys.dashboard(companyId!),
    queryFn: () => dashboardApi.summary(companyId!),
    enabled: !!companyId,
  });

  const { data: mineIssuesRaw = [] } = useQuery({
    queryKey: queryKeys.issues.listMineByMe(companyId!),
    queryFn: () =>
      issuesApi.list(companyId!, {
        touchedByUserId: "me",
        inboxArchivedByUserId: "me",
        status: INBOX_ISSUE_STATUSES,
      }),
    enabled: !!companyId,
  });

  const mineIssues = useMemo(() => getRecentTouchedIssues(mineIssuesRaw), [mineIssuesRaw]);

  const { data: heartbeatRuns = [] } = useQuery({
    queryKey: queryKeys.heartbeats(companyId!),
    queryFn: () => heartbeatsApi.list(companyId!),
    enabled: !!companyId,
  });

  return useMemo(
    () =>
      computeInboxBadgeData({
        approvals,
        joinRequests,
        dashboard,
        heartbeatRuns,
        mineIssues,
        dismissed,
        readItems,
      }),
    [approvals, joinRequests, dashboard, heartbeatRuns, mineIssues, dismissed, readItems],
  );
}
