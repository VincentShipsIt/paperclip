import { and, desc, eq, inArray, not } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, approvals, heartbeatRuns } from "@paperclipai/db";
import type { SidebarBadges } from "@paperclipai/shared";

const ACTIONABLE_APPROVAL_STATUSES = ["pending", "revision_requested"];
const FAILED_HEARTBEAT_STATUSES = ["failed", "timed_out"];

export function sidebarBadgeService(db: Db) {
  return {
    get: async (
      companyId: string,
      extra?: {
        joinRequestIds?: string[];
        unreadTouchedIssues?: number;
        dismissedKeys?: Set<string>;
        readKeys?: Set<string>;
      },
    ): Promise<SidebarBadges> => {
      const actionableApprovalIds = await db
        .select({ id: approvals.id })
        .from(approvals)
        .where(
          and(
            eq(approvals.companyId, companyId),
            inArray(approvals.status, ACTIONABLE_APPROVAL_STATUSES),
          ),
        );

      const latestRunByAgent = await db
        .selectDistinctOn([heartbeatRuns.agentId], {
          runId: heartbeatRuns.id,
          runStatus: heartbeatRuns.status,
        })
        .from(heartbeatRuns)
        .innerJoin(agents, eq(heartbeatRuns.agentId, agents.id))
        .where(
          and(
            eq(heartbeatRuns.companyId, companyId),
            eq(agents.companyId, companyId),
            not(eq(agents.status, "terminated")),
          ),
        )
        .orderBy(heartbeatRuns.agentId, desc(heartbeatRuns.createdAt));

      const failedRuns = latestRunByAgent.filter((row) =>
        FAILED_HEARTBEAT_STATUSES.includes(row.runStatus) &&
        !(extra?.dismissedKeys?.has(`run:${row.runId}`) ?? false) &&
        !(extra?.readKeys?.has(`run:${row.runId}`) ?? false),
      ).length;

      const actionableApprovals = actionableApprovalIds.filter(
        ({ id }) =>
          !(extra?.dismissedKeys?.has(`approval:${id}`) ?? false) &&
          !(extra?.readKeys?.has(`approval:${id}`) ?? false),
      ).length;
      const joinRequests = (extra?.joinRequestIds ?? []).filter(
        (id) =>
          !(extra?.dismissedKeys?.has(`join:${id}`) ?? false) &&
          !(extra?.readKeys?.has(`join:${id}`) ?? false),
      ).length;
      const unreadTouchedIssues = extra?.unreadTouchedIssues ?? 0;
      return {
        inbox: actionableApprovals + failedRuns + joinRequests + unreadTouchedIssues,
        approvals: actionableApprovals,
        failedRuns,
        joinRequests,
      };
    },
  };
}
