import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerPluginCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let pluginCmd = program.commands.find((c) => c.name() === "plugin");
  if (!pluginCmd) {
    pluginCmd = program
      .command("plugin")
      .description("Manage AKCP build-time plugins");
  }

  pluginCmd
    .command("list")
    .description("List all discovered plugins in a directory")
    .option(
      "-d, --dir <directory>",
      "Directory containing plugins",
      "./plugins",
    )
    .action(async (options) => {
      const path = await import("path");
      const { PluginRegistry } = await import("@akcp/core");

      try {
        const pluginsDir = path.resolve(process.cwd(), options.dir);

        console.log(`[INFO] Scanning for plugins in ${pluginsDir}...`);
        const discovered = PluginRegistry.discoverLocalPlugins(pluginsDir);

        if (discovered.length === 0) {
          console.log(`[INFO] No plugins found.`);
          return;
        }

        console.log(`\n=== Discovered Plugins (${discovered.length}) ===`);
        discovered.forEach((p: any) => {
          if (p.error) {
            console.error(
              `- ❌ [BROKEN] ${path.basename(p.dirPath)}: ${p.error}`,
            );
          } else {
            console.log(
              `- ✅ ${p.manifest.name} v${p.manifest.version} [${p.manifest.type}]`,
            );
            console.log(
              `     Permissions: ${p.manifest.permissions.join(", ") || "none"}`,
            );
          }
        });
        console.log();
      } catch (err: any) {
        console.error(`[ERROR] Plugin list failed: ${err.message}`);
        process.exit(1);
      }
    });

  pluginCmd
    .command("validate")
    .description("Strictly validate a plugin manifest")
    .argument("<directory>", "Path to the plugin directory")
    .action(async (directory) => {
      const path = await import("path");
      const { PluginLoader } = await import("@akcp/core");

      try {
        const pluginDir = path.resolve(process.cwd(), directory);

        console.log(`[INFO] Validating plugin at ${pluginDir}...`);
        const manifest = PluginLoader.loadManifest(pluginDir);

        console.log(`[OK] Plugin manifest is valid.`);
        console.log(`Name:        ${manifest.name}`);
        console.log(`Version:     ${manifest.version}`);
        console.log(`Type:        ${manifest.type}`);
        console.log(
          `Permissions: ${manifest.permissions.join(", ") || "none"}`,
        );
      } catch (err: any) {
        console.error(`[ERROR] Plugin validation failed: ${err.message}`);
        process.exit(1);
      }
    });
}
