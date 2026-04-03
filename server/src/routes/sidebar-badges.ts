import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { and, eq } from "drizzle-orm";
import { joinRequests } from "@paperclipai/db";
import { sidebarBadgeService } from "../services/sidebar-badges.js";
import { accessService } from "../services/access.js";
import { dashboardService } from "../services/dashboard.js";
import { assertCompanyAccess } from "./authz.js";

function parseQuerySet(value: unknown): Set<string> {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return new Set(rawValues.map((entry) => entry.trim()).filter(Boolean));
}

export function sidebarBadgeRoutes(db: Db) {
  const router = Router();
  const svc = sidebarBadgeService(db);
  const access = accessService(db);
  const dashboard = dashboardService(db);

  router.get("/companies/:companyId/sidebar-badges", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const dismissedKeys = parseQuerySet(req.query.dismissed);
    const readKeys = parseQuerySet(req.query.read);
    let canApproveJoins = false;
    if (req.actor.type === "board") {
      canApproveJoins =
        req.actor.source === "local_implicit" ||
        Boolean(req.actor.isInstanceAdmin) ||
        (await access.canUser(companyId, req.actor.userId, "joins:approve"));
    } else if (req.actor.type === "agent" && req.actor.agentId) {
      canApproveJoins = await access.hasPermission(companyId, "agent", req.actor.agentId, "joins:approve");
    }

    const joinRequestIds = canApproveJoins
      ? await db
        .select({ id: joinRequests.id })
        .from(joinRequests)
        .where(and(eq(joinRequests.companyId, companyId), eq(joinRequests.status, "pending_approval")))
        .then((rows) => rows.map((row) => row.id))
      : [];

    const badges = await svc.get(companyId, {
      joinRequestIds,
      dismissedKeys,
      readKeys,
    });
    const summary = await dashboard.summary(companyId);
    const hasFailedRuns = badges.failedRuns > 0;
    const alertsCount =
      (summary.agents.error > 0 && !hasFailedRuns && !dismissedKeys.has("alert:agent-errors")
        ? 1
        : 0) +
      (summary.costs.monthBudgetCents > 0 &&
      summary.costs.monthUtilizationPercent >= 80 &&
      !dismissedKeys.has("alert:budget")
        ? 1
        : 0);
    badges.inbox = badges.failedRuns + alertsCount + badges.joinRequests + badges.approvals;

    res.json(badges);
  });

  return router;
}
