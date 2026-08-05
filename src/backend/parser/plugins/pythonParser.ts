// Python Parser Plugin
import type { ILanguageParser, ParseResult, FunctionSymbol, ClassSymbol, ASTNode } from '../../shared/types';

export class PythonParser implements ILanguageParser {
  public language = 'Python';
  public supportedExtensions = ['.py', '.pyw'];

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
      if (trimmed.startsWith('#')) {
        commentLines++;
        return;
      }

      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        const parts = trimmed.split(' ');
        const mod = parts[1];
        if (mod) {
          imports.push(mod);
          dependencies.push(mod);
        }
      }

      if (trimmed.startsWith('def ')) {
        const nameMatch = trimmed.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (nameMatch && nameMatch[1]) {
          functions.push({
            name: nameMatch[1],
            line: idx + 1,
            endLine: idx + 15,
            length: 15,
            paramCount: (trimmed.match(/,/g) || []).length + 1,
            complexity: (line.match(/if|for|while|elif|and|or/g) || []).length + 1,
            isExported: !nameMatch[1].startsWith('_')
          });
          if (!nameMatch[1].startsWith('_')) exports.push(nameMatch[1]);
        }
      }

      if (trimmed.startsWith('class ')) {
        const nameMatch = trimmed.match(/class\s+([a-zA-Z0-9_]+)/);
        if (nameMatch && nameMatch[1]) {
          classes.push({
            name: nameMatch[1],
            line: idx + 1,
            endLine: idx + 40,
            methodsCount: 4,
            fieldsCount: 3,
            isExported: !nameMatch[1].startsWith('_')
          });
          if (!nameMatch[1].startsWith('_')) exports.push(nameMatch[1]);
        }
      }

      if (/^[a-zA-Z0-9_]+\s*=/.test(trimmed)) {
        const varName = trimmed.split('=')[0].trim();
        variables.push(varName);
      }
    });

    const ast: ASTNode = {
      type: 'Module',
      name: filePath,
      line: 1,
      endLine: lines.length,
      children: [
        ...imports.map(i => ({ type: 'Import', name: i, line: 1 })),
        ...functions.map(f => ({ type: 'FunctionDef', name: f.name, line: f.line })),
        ...classes.map(c => ({ type: 'ClassDef', name: c.name, line: c.line }))
      ]
    };

    return {
      filePath,
      language: 'Python',
      ast,
      imports: [...new Set(imports)],
      exports: [...new Set(exports)],
      classes,
      functions,
      variables: [...new Set(variables)],
      dependencies: [...new Set(dependencies)],
      linesOfCode: lines.length,
      commentLines
    };
  }
}
