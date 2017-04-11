'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import {
  DefinitionProvider, TextDocument, Position,
  CancellationToken, Location, Range,
  Uri, workspace,
} from 'vscode';
import { TypescriptSyntaxParser } from './typescript-syntax-parser';

function findWorkPath(dir) {
  const fileName = path.join(dir, 'package.json');
  if (fs.existsSync(fileName)) {
    return dir;
  }
  if (path.resolve(dir, '..') === '/') return null;
  return findWorkPath(path.resolve(dir, '..'));
}

function readFiles(baseDir: string, namespace = []) {
  const classMap = {};
  const files = fs.readdirSync(baseDir);
  files.forEach(item => {
    const subDir = path.join(baseDir, item);
    const stat = fs.statSync(subDir);
    if (stat.isDirectory()) {
      Object.assign(classMap, readFiles(subDir, [...namespace, item]));
      return;
    }
    if (/\.js$/.test(item)) {
      const fileName = item.replace(/\.js$/, '').replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
      const key = [...namespace, fileName].join('.');
      classMap[key] = path.join(baseDir, item);
      return;
    }
  });
  return classMap;
}

export class EggDefinitionProvider {
  public getFilePath(rootPath: string, definitionStatement: string, isMethod: boolean) {
    let filepath;
    ['proxy', 'service'].forEach(item => {
      if (filepath) return;
      let key = definitionStatement.substr(definitionStatement.indexOf(`${item}.`));
      const classMap = readFiles(path.join(rootPath, 'app', item), [item]);
      if (isMethod) {
        key = key.replace(/.\w+$/, '');
      }
      filepath = classMap[key];
    });
    return filepath;
  }
  public async provideDefinition(document: TextDocument, position: Position, token: CancellationToken) {
      // const lineText = document.lineAt(position).text;
      // 获取Definition所在的语句
      const statementRange = document.getWordRangeAtPosition(position, /([\w\.]+)/);
      // 获取definition所在的单词
      const wordRange = document.getWordRangeAtPosition(position);
      statementRange.end.isEqual(wordRange.end)
      // 获取语句开始到definition单词的位置
      const range = new Range(statementRange.start, wordRange.end);
      const definitionStatement = document.getText(range);
      const definitionWord = document.getText(wordRange);
      // 判断定位的位置是个方法还是类实例
      const isMethod = statementRange.end.isEqual(wordRange.end) ? true : false;
      // 获取项目根目录，默认package.json所在的目录为根目录
      const rootPath = findWorkPath(path.dirname(document.fileName));

      const fullpath = this.getFilePath(rootPath, definitionStatement, isMethod);
      if (!fullpath) {
        return null;
      }
      if (!isMethod) {
        return new Location(Uri.file(fullpath), new Position(0, 0));
      }
      const sourceFile = await TypescriptSyntaxParser.parseSourceFile(fullpath);
      if (!sourceFile) return null;
      
      const recursiveSyntaxKinds = [ts.SyntaxKind.ClassDeclaration, ts.SyntaxKind.Constructor];
      const foundNode = TypescriptSyntaxParser.findNode<ts.Declaration>(sourceFile, (node) => {
        let declaration = node as ts.Declaration;
        switch (node.kind) {
          case ts.SyntaxKind.PropertyDeclaration:
          case ts.SyntaxKind.MethodDeclaration:
          case ts.SyntaxKind.GetAccessor:
          case ts.SyntaxKind.SetAccessor:
            return declaration.name.getText() === definitionWord;
          case ts.SyntaxKind.Parameter:
            const publicAccessor = TypescriptSyntaxParser.findNode(node, (cn) => cn.kind === ts.SyntaxKind.PublicKeyword);
            return node.parent.kind == ts.SyntaxKind.Constructor
              && declaration.name.getText() === definitionWord
              && !!publicAccessor;
        }
        return false;
      }, recursiveSyntaxKinds);

      if (!foundNode) return null;
      const declarationPos = TypescriptSyntaxParser.parsePosition(sourceFile, foundNode.name.getStart());
      if (!declarationPos) return null;
      return new Location(Uri.file(fullpath), declarationPos);
  }
}