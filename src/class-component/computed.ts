import * as t from '@babel/types'
import flatMap = require('lodash.flatmap')
import { findProperty, literalKey, todoMethod, spreadTodoMethod } from '../nodes/utils'
import { copyParentNodeComments } from '../nodes/comments'
import { maybeConvertMethod } from './asis'

export function convertComputed(objectAst: t.ObjectExpression): t.ClassMethod[] {
  return flatMap(objectAst.properties, p => {
    if (t.isSpreadElement(p)) {
      console.warn(
        'Spread property is found in computed object. Automatic conversion of object spread is not supported.'
      )
      return [spreadTodoMethod(p)]
    }
    return computedObjectMemberToClassMember(p)
  })
}

function computedObjectMemberToClassMember(member: t.ObjectMember): t.ClassMethod[] {
  const method = maybeConvertMethod(member, 'get')
  if (method) return [method]

  if (!(t.isObjectProperty(member) && t.isObjectExpression(member.value))) {
    console.warn(`Computed property ${literalKey(member.key)} is not an Object.`)
    return [todoMethod(member, 'get')]
  }

  const getter = findProperty(member.value, 'get')
  const getterMethod = getter ? maybeConvertMethod(getter, 'get', member) : null
  if (!getterMethod) {
    console.warn(`Computed property ${literalKey(member.key)} does not have a valid getter.`)
    return [todoMethod(getter || member, 'get', member)]
  }
  const setter = findProperty(member.value, 'set')
  let setterMethod = setter ? maybeConvertMethod(setter, 'set', member) : null
  if (setter && !setterMethod) {
    console.warn(`Computed property ${literalKey(member.key)} has invalid setter.`)
    setterMethod = todoMethod(setter, 'set', member)
  }

  copyParentNodeComments({ leading: getterMethod, trailing: setterMethod || getterMethod, parent: member })
  return setterMethod ? [getterMethod, setterMethod] : [getterMethod]
}
