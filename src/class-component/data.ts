import * as t from '@babel/types'
import { literalKey, spreadTodoProperty, ClassMember, todoClassMember, checkThisUsed } from '../nodes/utils'
import { copyNodeComments, pushComment, lineComment, copyParentNodeComments } from '../nodes/comments'
import { convertGenericProperty } from './asis'

export function convertAndModifyData(memberAst: t.ObjectMember): ClassMember[] {
  let objectAst: t.ObjectExpression | null = t.isObjectMethod(memberAst)
    ? parseDataFuncBlock(memberAst.body)
    : parseDataProperty(memberAst)
  if (!objectAst) {
    console.warn('Convertable object expression is not found in data property.')
    return [todoClassMember(memberAst)]
  }
  const classProperties: ClassMember[] = []
  const objectMembersToKeep: (t.ObjectMember | t.SpreadElement)[] = []
  for (const p of objectAst.properties) {
    const { classProperty, keepObjectMember } = convertPropertyOfData(p)
    if (classProperty) classProperties.push(classProperty)
    if (keepObjectMember) objectMembersToKeep.push(p)
    if (typeof keepObjectMember === 'string') pushComment(p, lineComment(keepObjectMember))
  }

  if (objectMembersToKeep.length > 0) {
    // Manipulating subtree of memberAst.
    objectAst.properties = objectMembersToKeep
    return classProperties.concat(convertGenericProperty(memberAst))
  }

  copyParentNodeComments({
    leading: classProperties[0],
    trailing: classProperties[classProperties.length - 1],
    parent: memberAst
  })
  return classProperties
}

function parseDataProperty(propertyAst: t.ObjectProperty): t.ObjectExpression | null {
  const value = propertyAst.value
  switch (value.type) {
    case 'ObjectExpression':
      return value
    case 'FunctionExpression':
      return parseDataFuncBlock(value.body)
    case 'ArrowFunctionExpression':
      return parseDataArrowFunc(value)
  }
  return null
}

function parseDataFuncBlock(funcBlock: t.BlockStatement): t.ObjectExpression | null {
  // TODO: Improve type definition of find() with typeguard.
  const retStatement =
    funcBlock.body.find((statement): statement is t.ReturnStatement => t.isReturnStatement(statement)) || null
  if (retStatement && retStatement.argument && t.isObjectExpression(retStatement.argument)) {
    return retStatement.argument
  }
  return null
}

function parseDataArrowFunc(arrowFunc: t.ArrowFunctionExpression): t.ObjectExpression | null {
  if (checkThisUsed(arrowFunc)) {
    console.warn('Found usage of this in arrow function. It cannot be converted.')
    return null
  }
  if (t.isBlockStatement(arrowFunc.body)) {
    return parseDataFuncBlock(arrowFunc.body)
  }
  if (t.isObjectExpression(arrowFunc.body)) return arrowFunc.body
  return null
}

function convertPropertyOfData(
  property: t.ObjectMember | t.SpreadElement
): { classProperty: t.ClassProperty | null; keepObjectMember: boolean | string } {
  if (t.isSpreadElement(property)) {
    console.warn('Spread property is found in data object. Automatic conversion of object spread is not supported.')
    return {
      classProperty: spreadTodoProperty(property),
      keepObjectMember: 'vue-convert: Cannot convert spread in data, as its order in object can be important.'
    }
  }
  const key = literalKey(property.key) || 'TODO_invalidKey'
  if (t.isObjectMethod(property)) {
    console.warn(`Unsupported method "${key}" in data object.`)
    return { classProperty: null, keepObjectMember: 'vue-convert: Method in data object is not supported.' }
  }
  if (!t.isExpression(property.value)) {
    console.warn(`Invalid data member "${key}"`)
    return { classProperty: null, keepObjectMember: 'vue-convert: Cannot convert invalid data member.' }
  }
  const expr = property.value as t.Expression
  if (checkThisUsed(expr)) {
    const classProperty = t.classProperty(t.identifier(key), t.identifier('undefined'))
    pushComment(
      classProperty,
      lineComment('vue-convert: This property will initialized in data() method, with `this` reference.')
    )
    return { classProperty, keepObjectMember: true }
  }
  if (t.isIdentifier(property.value) && property.value.name === 'undefined') {
    const classProperty = t.classProperty(t.identifier(key), t.identifier('undefined'))
    pushComment(
      classProperty,
      lineComment(
        'vue-convert: vue-class-component ignores property with undefined, so data() method is required for this property.'
      )
    )
    return { classProperty, keepObjectMember: true }
  }
  return {
    classProperty: copyNodeComments(t.classProperty(t.identifier(key), expr), property),
    keepObjectMember: false
  }
}
