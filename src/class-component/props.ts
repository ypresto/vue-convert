import * as t from '@babel/types'
import { literalKey, todoProperty, spreadTodoProperty, ClassMember, todoNamedProperty } from '../nodes/utils'
import { copyNodeComments } from '../nodes/comments'

export function convertProps(objectAst: t.ObjectExpression): ClassMember[] {
  return objectAst.properties.map(property => {
    if (t.isSpreadElement(property)) {
      console.warn('Spread property is found in data object. Automatic conversion of object spread is not supported.')
      return spreadTodoProperty(property)
    }
    const key = literalKey(property.key) || 'TODO_invalidKey'
    if (t.isObjectMethod(property)) {
      console.warn(`Unsupported method "${key}" in props object.`)
      return todoProperty(property)
    }
    if (!t.isExpression(property.value)) {
      console.warn(`Invalid props member "${key}"`)
      return todoProperty(property)
    }
    const propsOptions = property.value as t.Expression
    const classProperty = copyNodeComments(t.classProperty(t.identifier(key)), property)
    classProperty.decorators = [t.decorator(t.callExpression(t.identifier('Prop'), [propsOptions]))]
    return classProperty
  })
}

export function convertArrayProps(arrayAst: t.ArrayExpression): ClassMember[] {
  return arrayAst.elements
    .filter(
      (element: null | t.Expression | t.SpreadElement): element is t.Expression | t.SpreadElement => element !== null
    )
    .map((element, i) => {
      if (t.isSpreadElement(element)) {
        console.warn('Spread property is found in data object. Automatic conversion of object spread is not supported.')
        return spreadTodoProperty(element)
      }
      if (!t.isStringLiteral(element)) {
        console.warn(`Element other than string literal is unsupported in props array.`)
        return todoNamedProperty(`props${i}`, element)
      }
      const property = copyNodeComments(t.classProperty(t.identifier(element.value)), element)
      property.decorators = [t.decorator(t.callExpression(t.identifier('Prop'), []))]
      return property
    })
}
