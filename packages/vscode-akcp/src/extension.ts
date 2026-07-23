import * as vscode from 'vscode';
import { parseExtensionConfig, buildValidateCommand } from './utils/config.js';

export function activate(context: vscode.ExtensionContext) {
  // eslint-disable-next-line no-console
  console.log('AKCP extension is now active!');

  const disposable = vscode.commands.registerCommand('akcp.validate', () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder found. Open the AKCP workspace first.');
      return;
    }

    const rawConfig = vscode.workspace.getConfiguration('akcp');
    const config = parseExtensionConfig(rawConfig);
    const command = buildValidateCommand(config);

    const terminal = vscode.window.createTerminal('AKCP Validation');
    terminal.show();
    terminal.sendText(command);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
