'use strict';

import * as path from 'path';
import * as fs from 'fs';
import { DefinitionProvider, TextDocument, Position, CancellationToken, Location, Range, Uri, workspace } from 'vscode';

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
  public provideDefinition(document: TextDocument, position: Position, token: CancellationToken):
    Thenable<Location> {
      // const lineText = document.lineAt(position).text;
      // 获取Definition所在的语句
      const statementRange = document.getWordRangeAtPosition(position, /([\w\.]+)/);
      // 获取definition所在的单词
      const wordRange = document.getWordRangeAtPosition(position);
      statementRange.end.isEqual(wordRange.end)
      // 获取语句开始到definition单词的位置
      const range = new Range(statementRange.start, wordRange.end);
      const definitionStatement = document.getText(range);
      // 判断定位的位置是个方法还是类实例
      const isMethod = statementRange.end.isEqual(wordRange.end) ? true : false;
      // 获取项目根目录，默认package.json所在的目录为根目录
      const rootPath = findWorkPath(path.dirname(document.fileName));

      const fullpath = this.getFilePath(rootPath, definitionStatement, isMethod);
      if (!fullpath) {
        return Promise.resolve(null);
      }
      return Promise.resolve(new Location(Uri.file(fullpath), new Position(0, 0)));
  }
}