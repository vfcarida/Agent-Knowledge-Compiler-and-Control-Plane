import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerCompletionCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("completion")
    .description("Generate shell autocompletion script (bash or zsh)")
    .argument("<shell>", "Shell type: bash or zsh")
    .action((shell) => {
      if (shell === "bash") {
        console.log(`
# akcp bash completion
_akcp_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  opts="init validate scan compile inspect verify import serve control-plane evals docs doctor agents config policy plan reconcile graph context lifecycle conformance scorecard plugin privacy completion"

  if [[ \${cur} == -* ]] ; then
    COMPREPLY=( $(compgen -W "--help --version --dry-run --format --bundle --profile --target --provenance" -- \${cur}) )
    return 0
  fi

  if [[ \${COMP_CWORD} -eq 1 ]] ; then
    COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
    return 0
  fi
}
complete -F _akcp_completion akcp
`);
      } else if (shell === "zsh") {
        console.log(`
# akcp zsh completion
_akcp() {
  local -a commands
  commands=(
    'init:Initialize a new .agent-context structure'
    'validate:Strict offline schema validation of an OKF/Context bundle'
    'scan:Analyze repository and suggest context document structures'
    'compile:Compile Context Packs to specified targets'
    'inspect:Inspect an AKCP compile manifest'
    'verify:Verify the cryptographic provenance and integrity of a compiled bundle'
    'import:Import from external systems into a Context Pack'
    'serve:Locally serve AKCP capabilities'
    'control-plane:Manage runtime governance, policies, and HITL approvals'
    'evals:Manage evaluation datasets and runs'
    'docs:Manage and diagnose repository documentation'
    'doctor:Diagnose environment configuration and readiness'
    'agents:Manage agent instruction files'
    'config:Manage AKCP configuration'
    'policy:Manage and validate machine-readable Policy Cards'
    'plan:Generate execution plan based on akcp.yaml'
    'reconcile:Reconcile desired state with current environment'
    'graph:Semantic Knowledge Graph operations'
    'context:Manage and optimize context economics'
    'lifecycle:Manage knowledge lifecycle'
    'conformance:Run conformance suite to certify OKF/AKCP compatibility'
    'scorecard:Calculate Agent Knowledge Readiness Scorecard'
    'plugin:Manage AKCP build-time plugins'
    'privacy:Manage PII redaction and privacy compliance'
    'completion:Generate shell autocompletion script'
  )
  _describe 'command' commands
}
compdef _akcp akcp
`);
      } else {
        console.error("[ERROR] Unsupported shell. Use 'bash' or 'zsh'.");
        process.exit(1);
      }
    });
}
