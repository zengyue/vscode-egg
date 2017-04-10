'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { pickProcess } from './pick-egg-process';
import { EggCompletionItemProvider } from './egg-completion-item-provider';
import { EggDefinitionProvider } from './egg-definition-provider';

export const DOCUMENT_MODE: vscode.DocumentFilter = { language: 'javascript', scheme: 'file' };

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.pickEggProcess', () => pickProcess())
  );

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(DOCUMENT_MODE, new EggDefinitionProvider())
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(DOCUMENT_MODE, new EggCompletionItemProvider(), '.')
  );

}

// this method is called when your extension is deactivated
export function deactivate() {
}
