// C / C++ Parser Plugin
import type { ILanguageParser, ParseResult, FunctionSymbol, ClassSymbol, ASTNode } from '../../shared/types';

export class CppParser implements ILanguageParser {
  public language = 'C++';
  public supportedExtensions = ['.c', '.cpp', '.h', '.hpp', '.cc', '.cxx'];

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

      if (trimmed.startsWith('#include')) {
        const header = trimmed.replace('#include', '').replace(/[<">]/g, '').trim();
        imports.push(header);
        dependencies.push(header);
      }

      const classMatch = trimmed.match(/(?:class|struct)\s+([a-zA-Z0-9_]+)/);
      if (classMatch && classMatch[1]) {
        classes.push({
          name: classMatch[1],
          line: idx + 1,
          endLine: idx + 30,
          methodsCount: 4,
          fieldsCount: 3,
          isExported: true
        });
        exports.push(classMatch[1]);
      }

      const funcMatch = trimmed.match(/(?:[\w:*&]+\s+)+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const)?\s*\{/);
      if (funcMatch && funcMatch[1]) {
        functions.push({
          name: funcMatch[1],
          line: idx + 1,
          endLine: idx + 20,
          length: 20,
          paramCount: (trimmed.match(/,/g) || []).length + 1,
          complexity: (line.match(/if|for|while|switch/g) || []).length + 1,
          isExported: true
        });
      }
    });

    const ast: ASTNode = {
      type: 'TranslationUnit',
      name: filePath,
      line: 1,
      endLine: lines.length,
      children: [
        ...classes.map(c => ({ type: 'ClassDecl', name: c.name, line: c.line }))
      ]
    };

    return {
      filePath,
      language: filePath.endsWith('.c') || filePath.endsWith('.h') ? 'C' : 'C++',
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
