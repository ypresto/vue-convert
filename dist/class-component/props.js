"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const t = require("@babel/types");
const utils_1 = require("../nodes/utils");
const comments_1 = require("../nodes/comments");
function convertProps(objectAst) {
    return objectAst.properties.map(property => {
        if (t.isSpreadElement(property)) {
            console.warn('Spread property is found in data object. Automatic conversion of object spread is not supported.');
            return utils_1.spreadTodoProperty(property);
        }
        const key = utils_1.literalKey(property.key) || 'TODO_invalidKey';
        if (t.isObjectMethod(property)) {
            console.warn(`Unsupported method "${key}" in props object.`);
            return utils_1.todoProperty(property);
        }
        if (!t.isExpression(property.value)) {
            console.warn(`Invalid props member "${key}"`);
            return utils_1.todoProperty(property);
        }
        const propsOptions = property.value;
        const classProperty = comments_1.copyNodeComments(t.classProperty(t.identifier(key)), property);
        classProperty.decorators = [t.decorator(t.callExpression(t.identifier('Prop'), [propsOptions]))];
        return classProperty;
    });
}
exports.convertProps = convertProps;
function convertArrayProps(arrayAst) {
    return arrayAst.elements
        .filter((element) => element !== null)
        .map((element, i) => {
        if (t.isSpreadElement(element)) {
            console.warn('Spread property is found in data object. Automatic conversion of object spread is not supported.');
            return utils_1.spreadTodoProperty(element);
        }
        if (!t.isStringLiteral(element)) {
            console.warn(`Element other than string literal is unsupported in props array.`);
            return utils_1.todoNamedProperty(`props${i}`, element);
        }
        const property = comments_1.copyNodeComments(t.classProperty(t.identifier(element.value)), element);
        property.decorators = [t.decorator(t.callExpression(t.identifier('Prop'), []))];
        return property;
    });
}
exports.convertArrayProps = convertArrayProps;
