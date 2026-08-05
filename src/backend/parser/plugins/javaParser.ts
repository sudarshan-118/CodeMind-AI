// Java Parser Plugin
import type { ILanguageParser, ParseResult, FunctionSymbol, ClassSymbol, ASTNode } from '../../shared/types';

export class JavaParser implements ILanguageParser {
  public language = 'Java';
  public supportedExtensions = ['.java'];

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

      if (trimmed.startsWith('import ')) {
        const pkg = trimmed.replace('import ', '').replace(';', '').trim();
        imports.push(pkg);
        dependencies.push(pkg);
      }

      const classMatch = trimmed.match(/(?:public\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_]+)/);
      if (classMatch && classMatch[1]) {
        classes.push({
          name: classMatch[1],
          line: idx + 1,
          endLine: idx + 50,
          methodsCount: 5,
          fieldsCount: 4,
          isExported: trimmed.includes('public')
        });
        exports.push(classMatch[1]);
      }

      const methodMatch = trimmed.match(/(?:public|protected|private)\s+(?:static\s+)?[\w<>\[\]]+\s+([a-zA-Z0-9_]+)\s*\(/);
      if (methodMatch && methodMatch[1]) {
        functions.push({
          name: methodMatch[1],
          line: idx + 1,
          endLine: idx + 15,
          length: 15,
          paramCount: (trimmed.match(/,/g) || []).length + 1,
          complexity: (line.match(/if|for|while|case|catch/g) || []).length + 1,
          isExported: trimmed.includes('public')
        });
      }
    });

    const ast: ASTNode = {
      type: 'CompilationUnit',
      name: filePath,
      line: 1,
      endLine: lines.length,
      children: [
        ...classes.map(c => ({ type: 'ClassDeclaration', name: c.name, line: c.line }))
      ]
    };

    return {
      filePath,
      language: 'Java',
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
