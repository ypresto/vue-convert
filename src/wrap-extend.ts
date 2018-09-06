/// <reference path="./vendor/recast.d.ts" />

import * as recast from 'recast'
import * as parser from 'recast/parsers/babylon'
import * as t from '@babel/types'
import flatMap = require('lodash.flatmap')

export function wrapComponentSourceWithExtend(source: string, file: string): string | null {
  const ast = recast.parse(source, { parser })

  const exported = ast.program.body.find(node => t.isExportDefaultDeclaration(node)) as t.ExportDefaultDeclaration

  if (!exported) {
    console.warn(`${file}: No export default declration found.`)
    return null
  }

  if (t.isClassDeclaration(exported.declaration)) {
    console.warn(`${file}: Already has default exported class declration.`)
    return null
  }

  if (!t.isObjectExpression(exported.declaration)) {
    console.warn(`${file}: export default it not object expression.`)
    return null
  }

  const objectExpr = exported.declaration

  const imports = ast.program.body.filter(
    (statement): statement is t.ImportDeclaration => t.isImportDeclaration(statement)
  )
  const locals = flatMap(imports, decl => decl.specifiers.map(spec => spec.local.name))
  if (locals.indexOf('Vue') < 0) {
    ast.program.body.unshift(
      t.importDeclaration([t.importDefaultSpecifier(t.identifier('Vue'))], t.stringLiteral('vue'))
    )
  }

  exported.declaration = t.callExpression(t.memberExpression(t.identifier('Vue'), t.identifier('extend')), [objectExpr])
  return recast.print(ast).code
}
