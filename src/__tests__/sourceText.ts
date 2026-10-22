// Reading the popover's source as code, for the tests that prove where code
// lives. The same helpers as cardSources.test.ts, which keeps its own copy.
import ts from "typescript";
import { expect } from "vitest";

export type Source = { file: string; ast: ts.SourceFile; code: string };

export function parse(file: string, text: string): ts.SourceFile {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
}

/**
 * The text with each comment blanked, newlines kept. A comment is in the
 * trivia before a token, as the compiler reads it, so a // inside a string, a
 * template or JSX text stays code.
 */
export function stripComments(ast: ts.SourceFile): string {
  const text = ast.text;
  const comments = new Map<number, number>();
  const visit = (node: ts.Node) => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
    // JSX text has no trivia: what looks like a comment there is text.
    if (ts.isTokenKind(node.kind) && node.kind !== ts.SyntaxKind.JsxText) {
      // Trailing: on the line the trivia starts on; leading: on the lines after.
      const trivia = [
        ...(ts.getTrailingCommentRanges(text, node.pos) ?? []),
        ...(ts.getLeadingCommentRanges(text, node.pos) ?? []),
      ];
      for (const c of trivia) comments.set(c.pos, c.end);
    }
    node.getChildren(ast).forEach(visit);
  };
  visit(ast);
  let code = text;
  for (const [pos, end] of comments) {
    code = code.slice(0, pos) + code.slice(pos, end).replace(/[^\n]/g, " ") + code.slice(end);
  }
  return code;
}

export function sources(domain: Record<string, string>): Source[] {
  return Object.entries(domain).map(([file, text]) => {
    const ast = parse(file, text);
    return { file, ast, code: stripComments(ast) };
  });
}

/** How often `pattern` matches in each file's code, for the files it matches. */
export function matches(all: Source[], pattern: RegExp): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { file, code } of all) {
    const n = code.match(new RegExp(pattern.source, "g"))?.length ?? 0;
    if (n) counts[file] = n;
  }
  return counts;
}

/** What each relative import declaration names, joined to the file's folder. */
export function importsOf(source: Source): string[] {
  return source.ast.statements
    .filter(ts.isImportDeclaration)
    .map((d) => (d.moduleSpecifier as ts.StringLiteral).text)
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) => new URL(specifier, `file://${source.file}`).pathname);
}

/** The source of `file`, which must be among `all`. */
export function sourceOf(all: Source[], file: string): Source {
  const source = all.find((s) => s.file === file);
  expect(source, file).toBeDefined();
  return source!;
}

/** Whether `importer` has an import of `target`, with or without its extension. */
export function imports(all: Source[], importer: string, target: string): boolean {
  return importsOf(sourceOf(all, importer)).some((path) => path === target || path === target.replace(/\.tsx?$/, ""));
}
