"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const t = require("@babel/types");
const utils_1 = require("../nodes/utils");
const comments_1 = require("../nodes/comments");
const asis_1 = require("./asis");
function convertAndModifyData(memberAst) {
    let objectAst = t.isObjectMethod(memberAst)
        ? parseDataFuncBlock(memberAst.body)
        : parseDataProperty(memberAst);
    if (!objectAst) {
        console.warn('Convertable object expression is not found in data property.');
        return [utils_1.todoClassMember(memberAst)];
    }
    const classProperties = [];
    const objectMembersToKeep = [];
    for (const p of objectAst.properties) {
        const { classProperty, keepObjectMember } = convertPropertyOfData(p);
        if (classProperty)
            classProperties.push(classProperty);
        if (keepObjectMember)
            objectMembersToKeep.push(p);
        if (typeof keepObjectMember === 'string')
            comments_1.pushComment(p, comments_1.lineComment(keepObjectMember));
    }
    if (objectMembersToKeep.length > 0) {
        // Manipulating subtree of memberAst.
        objectAst.properties = objectMembersToKeep;
        return classProperties.concat(asis_1.convertGenericProperty(memberAst));
    }
    comments_1.copyParentNodeComments({
        leading: classProperties[0],
        trailing: classProperties[classProperties.length - 1],
        parent: memberAst
    });
    return classProperties;
}
exports.convertAndModifyData = convertAndModifyData;
function parseDataProperty(propertyAst) {
    const value = propertyAst.value;
    switch (value.type) {
        case 'ObjectExpression':
            return value;
        case 'FunctionExpression':
            return parseDataFuncBlock(value.body);
        case 'ArrowFunctionExpression':
            return parseDataArrowFunc(value);
    }
    return null;
}
function parseDataFuncBlock(funcBlock) {
    // TODO: Improve type definition of find() with typeguard.
    const retStatement = funcBlock.body.find((statement) => t.isReturnStatement(statement)) || null;
    if (retStatement && retStatement.argument && t.isObjectExpression(retStatement.argument)) {
        return retStatement.argument;
    }
    return null;
}
function parseDataArrowFunc(arrowFunc) {
    if (utils_1.checkThisUsed(arrowFunc)) {
        console.warn('Found usage of this in arrow function. It cannot be converted.');
        return null;
    }
    if (t.isBlockStatement(arrowFunc.body)) {
        return parseDataFuncBlock(arrowFunc.body);
    }
    if (t.isObjectExpression(arrowFunc.body))
        return arrowFunc.body;
    return null;
}
function convertPropertyOfData(property) {
    if (t.isSpreadElement(property)) {
        console.warn('Spread property is found in data object. Automatic conversion of object spread is not supported.');
        return {
            classProperty: utils_1.spreadTodoProperty(property),
            keepObjectMember: 'vue-convert: Cannot convert spread in data, as its order in object can be important.'
        };
    }
    const key = utils_1.literalKey(property.key) || 'TODO_invalidKey';
    if (t.isObjectMethod(property)) {
        console.warn(`Unsupported method "${key}" in data object.`);
        return { classProperty: null, keepObjectMember: 'vue-convert: Method in data object is not supported.' };
    }
    if (!t.isExpression(property.value)) {
        console.warn(`Invalid data member "${key}"`);
        return { classProperty: null, keepObjectMember: 'vue-convert: Cannot convert invalid data member.' };
    }
    const expr = property.value;
    if (utils_1.checkThisUsed(expr)) {
        const classProperty = t.classProperty(t.identifier(key), t.identifier('undefined'));
        comments_1.pushComment(classProperty, comments_1.lineComment('vue-convert: This property will initialized in data() method, with `this` reference.'));
        return { classProperty, keepObjectMember: true };
    }
    if (t.isIdentifier(property.value) && property.value.name === 'undefined') {
        const classProperty = t.classProperty(t.identifier(key), t.identifier('undefined'));
        comments_1.pushComment(classProperty, comments_1.lineComment('vue-convert: vue-class-component ignores property with undefined, so data() method is required for this property.'));
        return { classProperty, keepObjectMember: true };
    }
    return {
        classProperty: comments_1.copyNodeComments(t.classProperty(t.identifier(key), expr), property),
        keepObjectMember: false
    };
}
