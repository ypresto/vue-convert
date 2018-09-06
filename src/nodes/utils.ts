import * as t from '@babel/types'
import { copyNodeComments } from './comments'

export type ClassMember = t.ClassProperty | t.ClassMethod
export type MethodKind = 'constructor' | 'method' | 'get' | 'set'

export function literalKey(expr: t.Expression): string | null {
  if (t.isIdentifier(expr)) return expr.name
  if (t.isStringLiteral(expr)) return expr.value
  return null
}

export function findProperty(ast: t.ObjectExpression, name: string): t.ObjectProperty | undefined
export function findProperty(ast: t.ClassExpression, name: string): t.ClassProperty | undefined
export function findProperty(ast: t.ObjectExpression | t.ClassExpression, name: string) {
  if (t.isObjectExpression(ast)) {
    return ast.properties.find(p => t.isObjectProperty(p) && literalKey(p.key) === name) as t.ObjectProperty | undefined
  } else {
    return ast.body.body.find(p => t.isClassProperty(p) && literalKey(p.key) === name) as t.ClassProperty | undefined
  }
}

export function todoNamedProperty(name: string, expr: t.Expression): t.ClassProperty {
  // TODO: add body as comment
  return copyNodeComments(t.classProperty(t.identifier(`TODO_${name}`), t.nullLiteral()), expr) // TODO: add body as comment
}

export function todoProperty(member: t.ObjectMember, baseMember: t.ObjectMember = member): t.ClassProperty {
  // TODO: add body as comment
  return copyNodeComments(
    t.classProperty(t.identifier(`TODO_${literalKey(member.key) || 'invalidKey'}`), t.nullLiteral()),
    member
  ) // TODO: add body as comment
}

export function todoMethod(
  member: t.ObjectMember,
  kind: MethodKind = 'method',
  baseMember: t.ObjectMember = member
): t.ClassMethod {
  // TODO: add body as comment
  return copyNodeComments(
    t.classMethod(kind, t.identifier(`TODO_${literalKey(baseMember.key) || 'invalidKey'}`), [], t.blockStatement([])),
    member
  )
}

export function spreadTodoProperty(spread: t.SpreadElement) {
  // TODO: add body as comment
  return copyNodeComments(t.classProperty(t.identifier(`TODO_spread_${spread.argument}`), t.nullLiteral()), spread)
}

export function spreadTodoMethod(spread: t.SpreadElement, kind: MethodKind = 'method'): t.ClassMethod {
  // TODO: add body as comment
  return copyNodeComments(
    t.classMethod(
      kind,
      t.identifier(`TODO_spread_${literalKey(spread.argument) || 'invalidArgument'}`),
      [],
      t.blockStatement([])
    ),
    spread
  )
}

export function todoClassMember(member: t.ObjectMember | t.SpreadElement): ClassMember {
  switch (member.type) {
    case 'SpreadElement':
      return spreadTodoMethod(member)
    case 'ObjectMethod':
      return todoMethod(member)
    case 'ObjectProperty':
      return todoProperty(member)
  }
}

// TODO: Unit test
export function checkThisUsed(expr: t.Expression): boolean {
  let thisUsed = false
  // TODO: Naive impl. @babel/traverse can skip or stop natively.
  t.traverse<{ skipNode: t.Node | null; stop: boolean }>(
    expr,
    {
      enter: (node, _, state) => {
        if (state.skipNode || state.stop) return
        switch (node.type) {
          case 'FunctionExpression':
          case 'FunctionDeclaration':
            state.skipNode = node
            break
          case 'ThisExpression':
            thisUsed = true
            state.stop = true
            break
        }
      },
      exit: (node, _, state) => {
        if (state.skipNode === node) {
          state.skipNode = null
        }
      }
    },
    { skipNode: null, stop: false }
  )
  return thisUsed
}
