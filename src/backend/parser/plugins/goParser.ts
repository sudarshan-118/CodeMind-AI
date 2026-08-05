// Go Parser Plugin
import type { ILanguageParser, ParseResult, FunctionSymbol, ClassSymbol, ASTNode } from '../../shared/types';

export class GoParser implements ILanguageParser {
  public language = 'Go';
  public supportedExtensions = ['.go'];

  public parse(filePath: string, code: string): ParseResult {
    const lines = code.split('\n');
    const imports: string[] = [];
    const exports: string[] = [];
    const classes: ClassSymbol[] = [];
    const functions: FunctionSymbol[] = [];
    const variables: string[] = [];
    const dependencies: string[] = [];
    let commentLines = 0;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        commentLines++;
        return;
      }

      if (trimmed.startsWith('import ') || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        const pkg = trimmed.replace('import', '').replace(/"/g, '').trim();
        if (pkg) {
          imports.push(pkg);
          dependencies.push(pkg);
        }
      }

      const structMatch = trimmed.match(/type\s+([a-zA-Z0-9_]+)\s+struct/);
      if (structMatch && structMatch[1]) {
        classes.push({
          name: structMatch[1],
          line: idx + 1,
          endLine: idx + 20,
          methodsCount: 2,
          fieldsCount: 3,
          isExported: /^[A-Z]/.test(structMatch[1])
        });
        if (/^[A-Z]/.test(structMatch[1])) exports.push(structMatch[1]);
      }

      const funcMatch = trimmed.match(/func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/);
      if (funcMatch && funcMatch[1]) {
        functions.push({
          name: funcMatch[1],
          line: idx + 1,
          endLine: idx + 15,
          length: 15,
          paramCount: (trimmed.match(/,/g) || []).length + 1,
          complexity: (line.match(/if|for|switch|select/g) || []).length + 1,
          isExported: /^[A-Z]/.test(funcMatch[1])
        });
        if (/^[A-Z]/.test(funcMatch[1])) exports.push(funcMatch[1]);
      }
    });

    const ast: ASTNode = {
      type: 'File',
      name: filePath,
      line: 1,
      endLine: lines.length,
      children: [
        ...functions.map(f => ({ type: 'FuncDecl', name: f.name, line: f.line }))
      ]
    };

    return {
      filePath,
      language: 'Go',
      ast,
      imports: [...new Set(imports)],
      exports: [...new Set(exports)],
      classes,
      functions,
      variables,
      dependencies: [...new Set(dependencies)],
      linesOfCode: lines.length,
      commentLines
    };
  }
}
