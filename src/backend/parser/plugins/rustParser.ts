// Rust Parser Plugin
import type { ILanguageParser, ParseResult, FunctionSymbol, ClassSymbol, ASTNode } from '../../shared/types';

export class RustParser implements ILanguageParser {
  public language = 'Rust';
  public supportedExtensions = ['.rs'];

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

      if (trimmed.startsWith('use ')) {
        const mod = trimmed.replace('use ', '').replace(';', '').trim();
        imports.push(mod);
        dependencies.push(mod);
      }

      const structMatch = trimmed.match(/(?:pub\s+)?struct\s+([a-zA-Z0-9_]+)/);
      if (structMatch && structMatch[1]) {
        classes.push({
          name: structMatch[1],
          line: idx + 1,
          endLine: idx + 20,
          methodsCount: 3,
          fieldsCount: 3,
          isExported: trimmed.startsWith('pub')
        });
        if (trimmed.startsWith('pub')) exports.push(structMatch[1]);
      }

      const fnMatch = trimmed.match(/(?:pub\s+)?fn\s+([a-zA-Z0-9_]+)\s*\(/);
      if (fnMatch && fnMatch[1]) {
        functions.push({
          name: fnMatch[1],
          line: idx + 1,
          endLine: idx + 15,
          length: 15,
          paramCount: (trimmed.match(/,/g) || []).length + 1,
          complexity: (line.match(/if|while|for|match|if let/g) || []).length + 1,
          isExported: trimmed.startsWith('pub')
        });
        if (trimmed.startsWith('pub')) exports.push(fnMatch[1]);
      }
    });

    const ast: ASTNode = {
      type: 'SourceFile',
      name: filePath,
      line: 1,
      endLine: lines.length,
      children: [
        ...functions.map(f => ({ type: 'Fn', name: f.name, line: f.line }))
      ]
    };

    return {
      filePath,
      language: 'Rust',
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
