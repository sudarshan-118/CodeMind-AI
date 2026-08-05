// Parser Registry and Plugin Dispatcher
import type { ILanguageParser, ParseResult, ASTNode } from '../shared/types';
import { LanguageDetector } from './detector';
import { JsTsParser } from './plugins/jsTsParser';
import { PythonParser } from './plugins/pythonParser';
import { JavaParser } from './plugins/javaParser';
import { GoParser } from './plugins/goParser';
import { RustParser } from './plugins/rustParser';
import { CppParser } from './plugins/cppParser';

export class ParserRegistry {
  private static parsers: ILanguageParser[] = [
    new JsTsParser(),
    new PythonParser(),
    new JavaParser(),
    new GoParser(),
    new RustParser(),
    new CppParser()
  ];

  public static registerParser(parser: ILanguageParser): void {
    this.parsers.push(parser);
  }

  public static getParserForFile(filePath: string): ILanguageParser | null {
    const extIdx = filePath.lastIndexOf('.');
    if (extIdx === -1) return null;
    const ext = filePath.slice(extIdx).toLowerCase();

    return this.parsers.find(p => p.supportedExtensions.includes(ext)) || null;
  }

  public static parse(filePath: string, code: string): ParseResult {
    const parser = this.getParserForFile(filePath);
    if (parser) {
      return parser.parse(filePath, code);
    }

    const language = LanguageDetector.detect(filePath, code);
    const lines = code.split('\n');
    let commentLines = 0;

    lines.forEach(l => {
      const t = l.trim();
      if (t.startsWith('//') || t.startsWith('#') || t.startsWith('/*')) commentLines++;
    });

    const ast: ASTNode = {
      type: 'TextDocument',
      name: filePath,
      line: 1,
      endLine: lines.length
    };

    return {
      filePath,
      language,
      ast,
      imports: [],
      exports: [],
      classes: [],
      functions: [],
      variables: [],
      dependencies: [],
      linesOfCode: lines.length,
      commentLines
    };
  }
}
