"use strict";
/// <reference path="../vendor/recast.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
const recast = require("recast");
const parser = require("recast/parsers/babylon");
const t = require("@babel/types");
const flatMap = require("lodash.flatmap");
const utils_1 = require("../nodes/utils");
const asis_1 = require("./asis");
const computed_1 = require("./computed");
const data_1 = require("./data");
const props_1 = require("./props");
const methods_1 = require("./methods");
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
];
const COMPONENT_OPTION_NAME_SET = new Set(COMPONENT_OPTION_NAMES);
function convertComponentSourceToClass(source, file) {
    const ast = recast.parse(source, { parser });
    const exported = ast.program.body.find(node => t.isExportDefaultDeclaration(node));
    if (!exported) {
        console.warn(`${file}: No export default declration found.`);
        return null;
    }
    if (t.isClassDeclaration(exported.declaration)) {
        console.warn(`${file}: Already has default exported class declration.`);
        return null;
    }
    if (!t.isObjectExpression(exported.declaration)) {
        console.warn(`${file}: export default it not object expression.`);
        return null;
    }
    const { classDeclaration, importNames } = convertComponentToClass(exported.declaration);
    exported.declaration = classDeclaration;
    ast.program.body.unshift(writeImport(importNames));
    return recast.print(ast).code;
}
exports.convertComponentSourceToClass = convertComponentSourceToClass;
function writeImport(names) {
    return t.importDeclaration(names.map(name => t.importSpecifier(t.identifier(name), t.identifier(name))), t.stringLiteral('vue-property-decorator'));
}
function convertComponentToClass(componentAst) {
    const nameProperty = utils_1.findProperty(componentAst, 'name');
    let name = 'AnonymousComponent';
    if (nameProperty && t.isStringLiteral(nameProperty.value)) {
        name = nameProperty.value.value;
    }
    const className = name.replace(/(?:^|-)(\w)/g, (_, p1) => p1.toUpperCase()); // UpperCamzelize
    const { classMembers, decoratorNames } = convertComponentBody(componentAst);
    const classDeclaration = t.classDeclaration(t.identifier(className), t.identifier('Vue'), // superClass
    t.classBody(classMembers), [writeDecorator(componentAst, name === className)]);
    return { classDeclaration, importNames: ['Vue', 'Component'].concat(decoratorNames) };
}
function isComponentOption(property) {
    return !t.isSpreadElement(property) && COMPONENT_OPTION_NAME_SET.has(utils_1.literalKey(property.key) || '');
}
function writeDecorator(componentAst, skipName) {
    const componentOptions = componentAst.properties.filter(p => isComponentOption(p) && !(skipName && p.key === 'name'));
    if (componentOptions.length === 0)
        return t.decorator(t.identifier('Component'));
    return t.decorator(t.callExpression(t.identifier('Component'), [t.objectExpression(componentOptions)]));
}
function requireObjectExpression(member, callback) {
    const key = utils_1.literalKey(member.key) || 'TODO_invalidKey';
    if (t.isObjectProperty(member) && t.isObjectExpression(member.value)) {
        return callback(member.value);
    }
    else {
        console.warn(`Property "${key}" is not a Object.`);
        return [utils_1.todoClassMember(member)];
    }
}
function convertComponentBody(componentAst) {
    const componentMembers = componentAst.properties.filter(p => !isComponentOption(p));
    const decoratorNameSet = new Set();
    const classMembers = flatMap(componentMembers, (member) => {
        if (t.isSpreadElement(member)) {
            console.warn('Spread property is found in component definition. Automatic conversion of object spread is not supported.');
            return [utils_1.spreadTodoMethod(member)];
        }
        switch (utils_1.literalKey(member.key)) {
            case 'data':
                return data_1.convertAndModifyData(member);
            case 'methods':
                return requireObjectExpression(member, objectAst => methods_1.convertMethods(objectAst));
            case 'computed':
                return requireObjectExpression(member, objectAst => computed_1.convertComputed(objectAst));
            case 'props':
                // TODO: Create option to enable or disable this (vue-property-decorator).
                let props;
                if (t.isObjectProperty(member) && t.isArrayExpression(member.value)) {
                    props = props_1.convertArrayProps(member.value);
                }
                else if (t.isObjectProperty(member) && t.isObjectExpression(member.value)) {
                    props = props_1.convertProps(member.value);
                }
                else {
                    console.warn(`Property "props" is not a Object or Array.`);
                    return [utils_1.todoClassMember(member)];
                }
                if (props.length > 0)
                    decoratorNameSet.add('Prop');
                return props;
        }
        return asis_1.convertGenericProperty(member);
    });
    return { classMembers, decoratorNames: [...decoratorNameSet] };
}
