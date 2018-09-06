import * as t from '@babel/types'
import { literalKey, todoProperty, ClassMember, MethodKind, checkThisUsed } from '../nodes/utils'
import { copyNodeComments } from '../nodes/comments'

export function convertGenericProperty(member: t.ObjectMember): ClassMember[] {
  const key = literalKey(member.key) || 'TODO_invalidKey'
  const method = maybeConvertMethod(member)
  if (method) return [method]
  const property = member as t.ObjectProperty
  if (t.isExpression(property.value)) {
    return [copyNodeComments(t.classProperty(t.identifier(key), property.value as t.Expression), property)]
  } else {
    console.warn(`Invalid object member of ${key}`)
    return [todoProperty(property)]
  }
}

export function maybeConvertMethod(
  member: t.ObjectMember,
  kind: MethodKind = 'method',
  baseMember: t.ObjectMember = member
): t.ClassMethod | null {
  if (t.isObjectMethod(member)) {
    return copyNodeComments(
      t.classMethod(kind, baseMember.key, member.params, member.body, baseMember.computed),
      member
    )
  }
  if (t.isFunctionExpression(member.value)) {
    return copyNodeComments(
      t.classMethod(kind, baseMember.key, member.value.params, member.value.body, baseMember.computed),
      member
    )
  }
  if (t.isArrowFunctionExpression(member.value)) {
    const arrowFunc = member.value
    if (checkThisUsed(arrowFunc)) {
      console.warn('Found usage of this in arrow function. It cannot be converted.')
      return null
    }
    // TODO: Maybe use @babel/traverse's path.arrowFunctionToExpression()
    if (t.isBlockStatement(arrowFunc.body)) {
      return copyNodeComments(t.classMethod(kind, baseMember.key, arrowFunc.params, arrowFunc.body), member)
    }
    const body = t.blockStatement([t.returnStatement(arrowFunc.body)])
    return copyNodeComments(t.classMethod(kind, baseMember.key, arrowFunc.params, body), member)
  }
  return null
}
