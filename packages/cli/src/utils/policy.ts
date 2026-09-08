/**
 * Merges the policy-relevant config scattered across akcp.yaml's top-level
 * `policy:` block, `controlPlane.policies`, and `privacy.defaultPiiMode` into
 * the shape BuildOptions.policies expects. Every caller that builds an IR from
 * a loaded AkcpConfig should route through this — omitting it leaves `ir.policies`
 * empty regardless of what the bundle actually declares.
 */
export function resolveIrPolicies(
  config: any,
): Record<string, unknown> | undefined {
  const rawPolicyBlock = config?.policy;
  const merged = {
    ...(config?.controlPlane?.policies || {}),
    ...(rawPolicyBlock?.defaultAutonomyLevel
      ? { defaultAutonomyLevel: rawPolicyBlock.defaultAutonomyLevel }
      : {}),
    ...(config?.privacy?.defaultPiiMode
      ? { piiHandling: config.privacy.defaultPiiMode }
      : {}),
  };
  return Object.keys(merged).length > 0 ? merged : undefined;
}
