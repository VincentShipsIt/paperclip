import type { CreateConfigValues } from "@paperclipai/adapter-utils";
import {
  DEFAULT_CODEX_LOCAL_BYPASS_APPROVALS_AND_SANDBOX,
  DEFAULT_CODEX_LOCAL_MODEL,
} from "@paperclipai/adapter-codex-local";
import { DEFAULT_CURSOR_LOCAL_MODEL } from "@paperclipai/adapter-cursor-local";
import { DEFAULT_GEMINI_LOCAL_MODEL } from "@paperclipai/adapter-gemini-local";

const BASE_CREATE_VALUES: CreateConfigValues = {
  adapterType: "codex_local",
  cwd: "",
  instructionsFilePath: "",
  promptTemplate: "",
  model: "",
  thinkingEffort: "",
  chrome: false,
  dangerouslySkipPermissions: true,
  search: false,
  fastMode: false,
  dangerouslyBypassSandbox: false,
  command: "",
  args: "",
  extraArgs: "",
  envVars: "",
  envBindings: {},
  url: "",
  bootstrapPrompt: "",
  payloadTemplateJson: "",
  workspaceStrategyType: "project_primary",
  workspaceBaseRef: "",
  workspaceBranchTemplate: "",
  worktreeParentDir: "",
  runtimeServicesJson: "",
  maxTurnsPerRun: 1000,
  heartbeatEnabled: false,
  intervalSec: 300,
};

export function buildDefaultCreateValues(
  adapterType: CreateConfigValues["adapterType"] = BASE_CREATE_VALUES.adapterType,
): CreateConfigValues {
  const values: CreateConfigValues = {
    ...BASE_CREATE_VALUES,
    adapterType,
  };

  if (adapterType === "codex_local") {
    values.model = DEFAULT_CODEX_LOCAL_MODEL;
    values.dangerouslyBypassSandbox =
      DEFAULT_CODEX_LOCAL_BYPASS_APPROVALS_AND_SANDBOX;
  } else if (adapterType === "gemini_local") {
    values.model = DEFAULT_GEMINI_LOCAL_MODEL;
  } else if (adapterType === "cursor") {
    values.model = DEFAULT_CURSOR_LOCAL_MODEL;
  }

  return values;
}

export const defaultCreateValues = buildDefaultCreateValues();
