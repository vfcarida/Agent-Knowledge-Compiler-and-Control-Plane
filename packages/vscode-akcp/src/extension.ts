import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('AKCP extension is now active!');

  let disposable = vscode.commands.registerCommand('akcp.validate', () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder found. Open the AKCP workspace first.');
      return;
    }

    const terminal = vscode.window.createTerminal('AKCP Validation');
    terminal.show();
    terminal.sendText('npx akcp validate');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
