// Unified AST Abstraction & AST Utilities

export type UnifiedASTKind =
  | 'Program'
  | 'Module'
  | 'ImportDeclaration'
  | 'ExportDeclaration'
  | 'ClassDeclaration'
  | 'InterfaceDeclaration'
  | 'FunctionDeclaration'
  | 'MethodDeclaration'
  | 'Parameter'
  | 'VariableDeclaration'
  | 'IfStatement'
  | 'ForStatement'
  | 'WhileStatement'
  | 'DoStatement'
  | 'SwitchStatement'
  | 'CaseClause'
  | 'CatchClause'
  | 'TryStatement'
  | 'CallExpression'
  | 'BinaryExpression'
  | 'BlockStatement'
  | 'ReturnStatement'
  | 'ExpressionStatement';

export interface UnifiedASTNode {
  kind: UnifiedASTKind;
  name?: string;
  line: number;
  endLine: number;
  children?: UnifiedASTNode[];
  metadata?: Record<string, any>;
}

export interface UnifiedAST {
  filePath: string;
  language: string;
  root: UnifiedASTNode;
  imports: Array<{ source: string; line: number; specifiers?: string[] }>;
  exports: Array<{ name: string; line: number }>;
  classes: Array<{ name: string; line: number; endLine: number; isExported: boolean; methodsCount: number; fieldsCount: number }>;
  functions: Array<{ name: string; line: number; endLine: number; isExported: boolean; paramCount: number; complexity: number; length: number }>;
  calls: Array<{ caller?: string; callee: string; line: number }>;
}

export class ASTUtils {
  /**
   * Traverse unified AST recursively
   */
  public static walk(node: UnifiedASTNode, visitor: (n: UnifiedASTNode) => void): void {
    visitor(node);
    if (node.children) {
      for (const child of node.children) {
        this.walk(child, visitor);
      }
    }
  }

  /**
   * Find all nodes matching target kind
   */
  public static filterByKind(node: UnifiedASTNode, kind: UnifiedASTKind): UnifiedASTNode[] {
    const matches: UnifiedASTNode[] = [];
    this.walk(node, n => {
      if (n.kind === kind) matches.push(n);
    });
    return matches;
  }

  /**
   * Count actual decision nodes in AST for Cyclomatic Complexity calculation
   */
  public static countDecisionNodes(node: UnifiedASTNode): number {
    let count = 0;
    const decisionKinds = new Set<UnifiedASTKind>([
      'IfStatement',
      'ForStatement',
      'WhileStatement',
      'DoStatement',
      'CaseClause',
      'CatchClause'
    ]);

    this.walk(node, n => {
      if (decisionKinds.has(n.kind)) {
        count++;
      }
      if (n.kind === 'BinaryExpression' && (n.name === '&&' || n.name === '||' || n.name === '??')) {
        count++;
      }
    });

    return count;
  }
}
