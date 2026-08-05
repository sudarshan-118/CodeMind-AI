// JS/TS Parser Plugin
import type { ILanguageParser, ParseResult, FunctionSymbol, ClassSymbol, ASTNode } from '../../shared/types';

export class JsTsParser implements ILanguageParser {
  public language = 'TypeScript';
  public supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

  public parse(filePath: string, code: string): ParseResult {
    const lines = code.split('\n');
    const imports: string[] = [];
    const exports: string[] = [];
    const classes: ClassSymbol[] = [];
    const functions: FunctionSymbol[] = [];
    const variables: string[] = [];
    const dependencies: string[] = [];
    let commentLines = 0;

    const importRegex = /(?:import\s+(?:[\w*\s{},$]+)\s+from\s+['"]([^'"]+)['"])|(?:require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface)\s+([a-zA-Z0-9_$]+)/g;
    const funcRegex = /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;
    const classRegex = /class\s+([a-zA-Z0-9_$]+)/g;
    const varRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const imp = match[1] || match[2];
      if (imp) {
        imports.push(imp);
        dependencies.push(imp);
      }
    }

    while ((match = exportRegex.exec(code)) !== null) {
      if (match[1]) exports.push(match[1]);
    }

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        commentLines++;
      }

      const fMatch = funcRegex.exec(line);
      if (fMatch) {
        const name = fMatch[1] || fMatch[2];
        if (name) {
          functions.push({
            name,
            line: idx + 1,
            endLine: idx + 10,
            length: 10,
            paramCount: (line.match(/,/g) || []).length + 1,
            complexity: (line.match(/if|for|while|case|catch|\&\&|\|\|/g) || []).length + 1,
            isExported: line.includes('export')
          });
        }
      }

      const cMatch = classRegex.exec(line);
      if (cMatch && cMatch[1]) {
        classes.push({
          name: cMatch[1],
          line: idx + 1,
          endLine: idx + 30,
          methodsCount: 3,
          fieldsCount: 2,
          isExported: line.includes('export')
        });
      }

      const vMatch = varRegex.exec(line);
      if (vMatch && vMatch[1]) {
        variables.push(vMatch[1]);
      }
    });

    const ast: ASTNode = {
      type: 'Program',
      name: filePath,
      line: 1,
      endLine: lines.length,
      children: [
        ...imports.map(i => ({ type: 'ImportDeclaration', name: i, line: 1 })),
        ...functions.map(f => ({ type: 'FunctionDeclaration', name: f.name, line: f.line })),
        ...classes.map(c => ({ type: 'ClassDeclaration', name: c.name, line: c.line }))
      ]
    };

    return {
      filePath,
      language: filePath.endsWith('ts') || filePath.endsWith('tsx') ? 'TypeScript' : 'JavaScript',
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
