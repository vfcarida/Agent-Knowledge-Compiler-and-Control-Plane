export interface AKCPExtensionConfig {
  akcpExecutable: string;
  defaultProfile: string;
}

export function parseExtensionConfig(rawConfig: unknown): AKCPExtensionConfig {
  return {
    akcpExecutable: rawConfig?.akcpExecutable || "npx akcp",
    defaultProfile: rawConfig?.defaultProfile || "software",
  };
}

export function buildValidateCommand(config: AKCPExtensionConfig): string {
  return `${config.akcpExecutable} validate`;
}
