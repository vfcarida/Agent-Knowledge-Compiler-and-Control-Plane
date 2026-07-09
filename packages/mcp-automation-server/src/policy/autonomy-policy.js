import { automationServerCapabilities } from '../capabilities.js';
export function enforcePolicy(toolName, policy) {
    if (!policy)
        return; // Unrestricted if no policy
    // Check explicit block lists
    if (policy.deniedTools.includes(toolName) || policy.deniedTools.includes('*')) {
        throw new Error(`Policy Violation: Tool '${toolName}' is explicitly denied by policy '${policy.policyId}'.`);
    }
    // Check capabilities
    const capability = automationServerCapabilities.find(c => c.name === toolName);
    if (!capability)
        return;
    const { autonomyLevel } = policy;
    const isWrite = capability.sideEffectLevel.includes('write') || capability.sideEffectLevel.includes('submit');
    if (autonomyLevel === 'observe') {
        if (isWrite) {
            throw new Error(`Policy Violation: Autonomy level 'observe' cannot execute write side-effect '${toolName}'.`);
        }
    }
    else if (autonomyLevel === 'advise') {
        if (capability.sideEffectLevel === 'external-submit' || capability.sideEffectLevel === 'local-write' || capability.sideEffectLevel === 'external-write') {
            throw new Error(`Policy Violation: Autonomy level 'advise' cannot execute '${capability.sideEffectLevel}' tool '${toolName}'.`);
        }
    }
    else if (autonomyLevel === 'act-with-approval') {
        // Requires an approval token (this is typically enforced inside the tool logic via ApprovalStore)
        // But we can assert that if the tool requires approval, it MUST be in the approvalRequiredFor list or '*'.
        if (capability.requiredApproval) {
            const allowedToApprove = policy.approvalRequiredFor.includes(toolName) || policy.approvalRequiredFor.includes('*');
            if (!allowedToApprove) {
                throw new Error(`Policy Violation: Tool '${toolName}' requires approval, but policy '${policy.policyId}' does not whitelist it for approval-based execution.`);
            }
        }
    }
}
//# sourceMappingURL=autonomy-policy.js.map