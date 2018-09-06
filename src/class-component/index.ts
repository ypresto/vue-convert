/// <reference path="../vendor/recast.d.ts" />

import * as recast from 'recast'
import * as parser from 'recast/parsers/babylon'
import * as t from '@babel/types'
import flatMap = require('lodash.flatmap')
import { findProperty, literalKey, spreadTodoMethod, ClassMember, todoClassMember } from '../nodes/utils'

import { convertGenericProperty } from './asis'
import { convertComputed } from './computed'
import { convertAndModifyData } from './data'
import { convertProps, convertArrayProps } from './props'
import { convertMethods } from './methods'

// TODO: if name is not UpperCamelCase, use name option.
// name?: string;
// TODO: support properly inferred 'extends'
// extends?: ComponentOptions<Vue> | typeof Vue;
// TODO: Support watch
const COMPONENT_OPTION_NAMES = [
  'watch',
  'el',
  'template',
  'directives',
  'components',
  'transitions',
  'filters',
  'inject',
  'model',
  // TODO: support class-style mixins https://github.com/vuejs/vue-class-component#using-mixins
  'mixins',
  'name',
  'extends',
  'delimiters',
  'comments',
  'inheritAttrs',
  // vue-router
  'route',
  // Vue SSR
  'serverCacheKey'
]
const COMPONENT_OPTION_NAME_SET = new Set(COMPONENT_OPTION_NAMES)

export function convertComponentSourceToClass(source: string, file: string): string | null {
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

  const { classDeclaration, importNames } = convertComponentToClass(exported.declaration)
  exported.declaration = classDeclaration
  ast.program.body.unshift(writeImport(importNames))
  return recast.print(ast).code
}

function writeImport(names: string[]): t.ImportDeclaration {
  return t.importDeclaration(
    names.map(name => t.importSpecifier(t.identifier(name), t.identifier(name))),
    t.stringLiteral('vue-property-decorator')
  )
}

function convertComponentToClass(
  componentAst: t.ObjectExpression
): { classDeclaration: t.ClassDeclaration; importNames: string[] } {
  const nameProperty = findProperty(componentAst, 'name')
  let name = 'AnonymousComponent'
  if (nameProperty && t.isStringLiteral(nameProperty.value)) {
    name = nameProperty.value.value
  }
  const className = name.replace(/(?:^|-)(\w)/g, (_, p1) => p1.toUpperCase()) // UpperCamzelize

  const { classMembers, decoratorNames } = convertComponentBody(componentAst)

  const classDeclaration = t.classDeclaration(
    t.identifier(className),
    t.identifier('Vue'), // superClass
    t.classBody(classMembers),
    [writeDecorator(componentAst, name === className)]
  )

  return { classDeclaration, importNames: ['Vue', 'Component'].concat(decoratorNames) }
}

function isComponentOption(property: t.ObjectProperty | t.ObjectMethod | t.SpreadElement): property is t.ObjectMember {
  return !t.isSpreadElement(property) && COMPONENT_OPTION_NAME_SET.has(literalKey(property.key) || '')
}

function writeDecorator(componentAst: t.ObjectExpression, skipName: boolean): t.Decorator {
  const componentOptions = componentAst.properties.filter(p => isComponentOption(p) && !(skipName && p.key === 'name'))
  if (componentOptions.length === 0) return t.decorator(t.identifier('Component'))
  return t.decorator(t.callExpression(t.identifier('Component'), [t.objectExpression(componentOptions)]))
}

function requireObjectExpression(
  member: t.ObjectMember,
  callback: (objectAst: t.ObjectExpression) => ClassMember[]
): ClassMember[] {
  const key = literalKey(member.key) || 'TODO_invalidKey'
  if (t.isObjectProperty(member) && t.isObjectExpression(member.value)) {
    return callback(member.value)
  } else {
    console.warn(`Property "${key}" is not a Object.`)
    return [todoClassMember(member)]
  }
}

function convertComponentBody(
  componentAst: t.ObjectExpression
): { classMembers: ClassMember[]; decoratorNames: string[] } {
  const componentMembers = componentAst.properties.filter(p => !isComponentOption(p))
  const decoratorNameSet = new Set()

  const classMembers = flatMap(
    componentMembers,
    (member): ClassMember[] => {
      if (t.isSpreadElement(member)) {
        console.warn(
          'Spread property is found in component definition. Automatic conversion of object spread is not supported.'
        )
        return [spreadTodoMethod(member)]
      }

      switch (literalKey(member.key)) {
        case 'data':
          return convertAndModifyData(member)
        case 'methods':
          return requireObjectExpression(member, objectAst => convertMethods(objectAst))
        case 'computed':
          return requireObjectExpression(member, objectAst => convertComputed(objectAst))
        case 'props':
          // TODO: Create option to enable or disable this (vue-property-decorator).
          let props: ClassMember[]
          if (t.isObjectProperty(member) && t.isArrayExpression(member.value)) {
            props = convertArrayProps(member.value)
          } else if (t.isObjectProperty(member) && t.isObjectExpression(member.value)) {
            props = convertProps(member.value)
          } else {
            console.warn(`Property "props" is not a Object or Array.`)
            return [todoClassMember(member)]
          }
          if (props.length > 0) decoratorNameSet.add('Prop')
          return props
      }
      return convertGenericProperty(member)
    }
  )

  return { classMembers, decoratorNames: [...decoratorNameSet] }
}
