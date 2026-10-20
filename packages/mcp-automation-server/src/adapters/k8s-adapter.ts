import { z } from "zod";
import type {
  ActionContext,
  ActionRegistry,
  ActionResult,
} from "../action-registry.js";

export interface KubectlExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type KubectlRunner = (args: string[]) => Promise<KubectlExecutionResult>;

export interface KubernetesAdapterConfig {
  allowedNamespaces?: string[];
  maxReplicas?: number;
  allowZeroReplicas?: boolean;
  requireChangeWindow?: boolean;
  isChangeWindowOpen?: () => boolean;
  dryRun?: boolean;
  runner?: KubectlRunner;
}

const SAFE_K8S_NAME_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export const RolloutRestartSchema = z.object({
  namespace: z.string().min(1),
  deployment: z.string().min(1),
  reason: z.string().optional(),
});

export const ScaleDeploymentSchema = z.object({
  namespace: z.string().min(1),
  deployment: z.string().min(1),
  replicas: z.number().int(),
  reason: z.string().optional(),
});

export const RollbackDeploymentSchema = z.object({
  namespace: z.string().min(1),
  deployment: z.string().min(1),
  toRevision: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

export const GetPodLogsSchema = z.object({
  namespace: z.string().min(1),
  pod: z.string().min(1),
  tailLines: z.number().int().min(1).max(500).default(100),
});

export class KubernetesAdapter {
  private readonly allowedNamespaces: Set<string>;
  private readonly maxReplicas: number;
  private readonly allowZeroReplicas: boolean;
  private readonly requireChangeWindow: boolean;
  private readonly isChangeWindowOpen: () => boolean;
  private readonly dryRun: boolean;
  private readonly runner?: KubectlRunner;

  constructor(config: KubernetesAdapterConfig = {}) {
    this.allowedNamespaces = new Set(
      config.allowedNamespaces ?? ["default", "production", "staging"],
    );
    this.maxReplicas = config.maxReplicas ?? 20;
    this.allowZeroReplicas = config.allowZeroReplicas ?? false;
    this.requireChangeWindow = config.requireChangeWindow ?? false;
    this.isChangeWindowOpen = config.isChangeWindowOpen ?? (() => true);
    this.dryRun = config.dryRun ?? true;
    this.runner = config.runner;
  }

  private validateNamespaceAndName(
    namespace: string,
    resourceName: string,
  ): string | null {
    if (!SAFE_K8S_NAME_RE.test(namespace)) {
      return `Invalid Kubernetes namespace identifier: '${namespace}'`;
    }
    if (!SAFE_K8S_NAME_RE.test(resourceName)) {
      return `Invalid Kubernetes resource name: '${resourceName}'`;
    }
    if (namespace === "kube-system" || namespace === "kube-public") {
      return `Namespace '${namespace}' is system-protected and cannot be modified by agent automation.`;
    }
    if (!this.allowedNamespaces.has(namespace)) {
      return `Namespace '${namespace}' is not in the allowed namespaces list (${Array.from(this.allowedNamespaces).join(", ")}).`;
    }
    return null;
  }

  private checkChangeWindow(context: ActionContext): string | null {
    if (
      this.requireChangeWindow &&
      !this.isChangeWindowOpen() &&
      !context.approvalToken
    ) {
      return "Operation blocked: Outside approved change window and no HITL approvalToken provided.";
    }
    return null;
  }

  private async executeKubectl(
    args: string[],
    context: ActionContext,
  ): Promise<ActionResult> {
    const finalArgs = this.dryRun ? [...args, "--dry-run=client"] : [...args];

    if (!this.runner) {
      return {
        success: true,
        data: {
          mode: this.dryRun ? "dry-run" : "simulated",
          command: `kubectl ${finalArgs.join(" ")}`,
          agentId: context.agentId ?? "anonymous",
          timestamp: new Date().toISOString(),
        },
      };
    }

    const res = await this.runner(finalArgs);
    if (res.exitCode !== 0) {
      return {
        success: false,
        error: res.stderr || `kubectl exited with code ${res.exitCode}`,
      };
    }

    return {
      success: true,
      data: {
        mode: this.dryRun ? "dry-run" : "live",
        command: `kubectl ${finalArgs.join(" ")}`,
        stdout: res.stdout,
        agentId: context.agentId ?? "anonymous",
      },
    };
  }

  async rolloutRestart(
    rawParams: unknown,
    context: ActionContext = {},
  ): Promise<ActionResult> {
    const parsed = RolloutRestartSchema.safeParse(rawParams);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }
    const { namespace, deployment } = parsed.data;
    const nsErr = this.validateNamespaceAndName(namespace, deployment);
    if (nsErr) return { success: false, error: nsErr };

    const cwErr = this.checkChangeWindow(context);
    if (cwErr) return { success: false, error: cwErr };

    return this.executeKubectl(
      ["rollout", "restart", `deployment/${deployment}`, "-n", namespace],
      context,
    );
  }

  async scaleDeployment(
    rawParams: unknown,
    context: ActionContext = {},
  ): Promise<ActionResult> {
    const parsed = ScaleDeploymentSchema.safeParse(rawParams);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }
    const { namespace, deployment, replicas } = parsed.data;
    const nsErr = this.validateNamespaceAndName(namespace, deployment);
    if (nsErr) return { success: false, error: nsErr };

    const minAllowed = this.allowZeroReplicas ? 0 : 1;
    if (replicas < minAllowed || replicas > this.maxReplicas) {
      return {
        success: false,
        error: `Replica count ${replicas} violates safety bounds [${minAllowed}, ${this.maxReplicas}].`,
      };
    }

    const cwErr = this.checkChangeWindow(context);
    if (cwErr) return { success: false, error: cwErr };

    return this.executeKubectl(
      [
        "scale",
        `deployment/${deployment}`,
        `--replicas=${replicas}`,
        "-n",
        namespace,
      ],
      context,
    );
  }

  async rollbackDeployment(
    rawParams: unknown,
    context: ActionContext = {},
  ): Promise<ActionResult> {
    const parsed = RollbackDeploymentSchema.safeParse(rawParams);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }
    const { namespace, deployment, toRevision } = parsed.data;
    const nsErr = this.validateNamespaceAndName(namespace, deployment);
    if (nsErr) return { success: false, error: nsErr };

    const cwErr = this.checkChangeWindow(context);
    if (cwErr) return { success: false, error: cwErr };

    const args = [
      "rollout",
      "undo",
      `deployment/${deployment}`,
      "-n",
      namespace,
    ];
    if (toRevision !== undefined) {
      args.push(`--to-revision=${toRevision}`);
    }

    return this.executeKubectl(args, context);
  }

  async getPodLogs(
    rawParams: unknown,
    context: ActionContext = {},
  ): Promise<ActionResult> {
    const parsed = GetPodLogsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }
    const { namespace, pod, tailLines } = parsed.data;
    const nsErr = this.validateNamespaceAndName(namespace, pod);
    if (nsErr) return { success: false, error: nsErr };

    const args = ["logs", pod, "-n", namespace, `--tail=${tailLines}`];
    if (!this.runner) {
      return {
        success: true,
        data: {
          mode: "simulated",
          command: `kubectl ${args.join(" ")}`,
          logs: `[Pod ${pod}] Health check OK`,
        },
      };
    }

    const res = await this.runner(args);
    if (res.exitCode !== 0) {
      return {
        success: false,
        error: res.stderr || `kubectl logs failed with code ${res.exitCode}`,
      };
    }
    return {
      success: true,
      data: {
        command: `kubectl ${args.join(" ")}`,
        logs: res.stdout,
        agentId: context.agentId ?? "anonymous",
      },
    };
  }
}

export function registerKubernetesActions(
  registry: ActionRegistry,
  config?: KubernetesAdapterConfig,
): KubernetesAdapter {
  const adapter = new KubernetesAdapter(config);

  registry.register({
    id: "k8s_rollout_restart",
    description:
      "Perform a governed Kubernetes deployment rollout restart within allowed namespaces",
    domain: "it-operations",
    riskLevel: "high",
    parameters: RolloutRestartSchema,
    handler: (params, ctx) => adapter.rolloutRestart(params, ctx),
  });

  registry.register({
    id: "k8s_scale_deployment",
    description:
      "Scale a Kubernetes deployment within enforced min/max replica safety bounds",
    domain: "it-operations",
    riskLevel: "high",
    parameters: ScaleDeploymentSchema,
    handler: (params, ctx) => adapter.scaleDeployment(params, ctx),
  });

  registry.register({
    id: "k8s_rollback_deployment",
    description:
      "Rollback a Kubernetes deployment to its previous or specified revision",
    domain: "it-operations",
    riskLevel: "critical",
    parameters: RollbackDeploymentSchema,
    handler: (params, ctx) => adapter.rollbackDeployment(params, ctx),
  });

  registry.register({
    id: "k8s_get_pod_logs",
    description: "Retrieve bounded tail logs from a Kubernetes pod",
    domain: "it-operations",
    riskLevel: "low",
    parameters: GetPodLogsSchema,
    handler: (params, ctx) => adapter.getPodLogs(params, ctx),
  });

  return adapter;
}
