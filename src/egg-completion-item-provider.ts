'use strict';

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem } from 'vscode';

export class EggCompletionItemProvider implements CompletionItemProvider {
  public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken)
    : Thenable<CompletionItem[]> {
      const textCurrentLine = document.getText(document.lineAt(position).range);
      console.log(textCurrentLine);
      return Promise.reject(null);
  }

  resolveCompletionItem(item: CompletionItem): Thenable<CompletionItem> {
    //读取详细信息
    // item.detail='detail'
    return Promise.resolve(item);
  }
}