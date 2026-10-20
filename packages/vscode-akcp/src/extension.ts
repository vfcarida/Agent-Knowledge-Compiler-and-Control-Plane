import * as vscode from "vscode";
import {
  parseExtensionConfig,
  buildValidateCommand,
  buildCompileCommand,
} from "./utils/config.js";
import { analyzeOkfFrontmatter } from "./utils/diagnostics.js";
import { getOkfFrontmatterCompletions } from "./utils/completion.js";

export function activate(context: vscode.ExtensionContext) {
  console.log("AKCP extension is now active!");

  const validateDisposable = vscode.commands.registerCommand(
    "akcp.validate",
    () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          "No workspace folder found. Open the AKCP workspace first.",
        );
        return;
      }

      const rawConfig = vscode.workspace.getConfiguration("akcp");
      const config = parseExtensionConfig(rawConfig);
      const command = buildValidateCommand(config);

      const terminal = vscode.window.createTerminal("AKCP Validation");
      terminal.show();
      terminal.sendText(command);
    },
  );

  const compileDisposable = vscode.commands.registerCommand(
    "akcp.compile",
    () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          "No workspace folder found. Open the AKCP workspace first.",
        );
        return;
      }

      const rawConfig = vscode.workspace.getConfiguration("akcp");
      const config = parseExtensionConfig(rawConfig);
      const command = buildCompileCommand(config);

      const terminal = vscode.window.createTerminal("AKCP Compiler");
      terminal.show();
      terminal.sendText(command);
    },
  );

  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("okf");

  const updateDiagnostics = (doc: vscode.TextDocument) => {
    if (doc.languageId !== "okf" && !doc.fileName.includes(".okf")) {
      return;
    }
    const issues = analyzeOkfFrontmatter(doc.getText());
    const diagnostics = issues.map((issue) => {
      const range = new vscode.Range(issue.line, 0, issue.line, 80);
      const severity =
        issue.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning;
      const diag = new vscode.Diagnostic(range, issue.message, severity);
      diag.code = issue.code;
      diag.source = "akcp-okf";
      return diag;
    });
    diagnosticCollection.set(doc.uri, diagnostics);
  };

  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    ["okf", "markdown"],
    {
      provideCompletionItems(document, position) {
        const linePrefix = document
          .lineAt(position)
          .text.slice(0, position.character);
        return getOkfFrontmatterCompletions(linePrefix).map((item) => {
          const completion = new vscode.CompletionItem(
            item.label,
            vscode.CompletionItemKind.Property,
          );
          completion.detail = item.detail;
          completion.insertText = item.insertText;
          return completion;
        });
      },
    },
    ":",
    " ",
  );

  context.subscriptions.push(
    validateDisposable,
    compileDisposable,
    diagnosticCollection,
    completionDisposable,
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
    vscode.workspace.onDidSaveTextDocument(updateDiagnostics),
  );
}

export function deactivate() {}
