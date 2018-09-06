import * as t from '@babel/types'
import { todoMethod, spreadTodoMethod } from '../nodes/utils'
import { maybeConvertMethod } from './asis'

export function convertMethods(objectAst: t.ObjectExpression): t.ClassMethod[] {
  return objectAst.properties.map(p => {
    if (t.isSpreadElement(p)) {
      console.warn(
        'Spread property is found in methods object. Automatic conversion of object spread is not supported.'
      )
      return spreadTodoMethod(p)
    }
    const method = maybeConvertMethod(p)
    if (method) return method
    console.warn(`Non-function property ${p.type} is found in methods object.`)
    return todoMethod(p, 'method')
  })
}
