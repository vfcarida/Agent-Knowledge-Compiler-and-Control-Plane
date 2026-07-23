export interface AKCPExtensionConfig {
  akcpExecutable: string;
  defaultProfile: string;
}

export function parseExtensionConfig(rawConfig: unknown): AKCPExtensionConfig {
  const config = rawConfig as Record<string, any> | undefined;
  return {
    akcpExecutable: config?.akcpExecutable || "npx akcp",
    defaultProfile: config?.defaultProfile || "software",
  };
}

export function buildValidateCommand(config: AKCPExtensionConfig): string {
  return `${config.akcpExecutable} validate`;
}
