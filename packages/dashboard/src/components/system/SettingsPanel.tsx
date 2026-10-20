import { Settings, Shield, Database, Terminal } from "lucide-react";

export function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="text-neon-indigo" />
            Control Plane Settings
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Runtime configuration, MCP endpoint bindings, and zero-trust policy
            enforcement defaults.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl border border-dark-border space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Shield className="w-5 h-5 text-neon-blue" />
            <span>Gateway Enforcement Mode</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            All high-risk and external-submit MCP tool invocations require
            cryptographic SHA-256 payload-bound approval tokens and human
            sign-off.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs border-t border-white/5">
            <span className="text-zinc-400">Default Autonomy Level</span>
            <code className="text-emerald-400">read-only (fail-closed)</code>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Runtime Automation Mode</span>
            <code className="text-neon-indigo">sandbox</code>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-dark-border space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Database className="w-5 h-5 text-neon-purple" />
            <span>Persistence & Audit Store</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Approval tokens and audit records are persisted in local SQLite or
            Redis (when <code>REDIS_URL</code> is configured) with automatic TTL
            expiration.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs border-t border-white/5">
            <span className="text-zinc-400">Token Binding</span>
            <code className="text-zinc-200">SHA-256 + Single-Use Consume</code>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Telemetry Export</span>
            <code className="text-zinc-200">OpenTelemetry + JSONL Audit</code>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-dark-border space-y-2">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <span>CLI Synchronization Commands</span>
        </div>
        <p className="text-xs text-zinc-400">
          Use <code>npx akcp compile</code> to rebuild artifacts,{" "}
          <code>npx akcp policy lint</code> to verify policy cards for rule
          shadowing, and <code>npx akcp verify</code> to validate artifact
          checksums.
        </p>
      </div>
    </div>
  );
}
