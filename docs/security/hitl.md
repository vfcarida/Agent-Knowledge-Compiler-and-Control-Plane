# Human-in-the-Loop (HITL) Policy

The Agent Knowledge Compiler and Control Plane strictly enforces a Human-in-the-Loop policy for all side-effecting operations.

## Requirements

1. **No Silent State Changes**: Any action that alters external systems (like applying to a job) MUST require explicit user confirmation.
2. **Two-Step Execution**:
   - `prepare_application`: The LLM sets up the context, generates the payload, and requests an approval token.
   - `confirm_application_submission`: The LLM provides the token (which the user must approve in the UI/client) to execute the action.
3. **Token Expiration**: Approval tokens expire after 15 minutes to prevent stale contexts.
4. **Single-Use**: Tokens are invalidated immediately after use.
