"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const t = require("@babel/types");
const flatMap = require("lodash.flatmap");
const utils_1 = require("../nodes/utils");
const comments_1 = require("../nodes/comments");
const asis_1 = require("./asis");
function convertComputed(objectAst) {
    return flatMap(objectAst.properties, p => {
        if (t.isSpreadElement(p)) {
            console.warn('Spread property is found in computed object. Automatic conversion of object spread is not supported.');
            return [utils_1.spreadTodoMethod(p)];
        }
        return computedObjectMemberToClassMember(p);
    });
}
exports.convertComputed = convertComputed;
function computedObjectMemberToClassMember(member) {
    const method = asis_1.maybeConvertMethod(member, 'get');
    if (method)
        return [method];
    if (!(t.isObjectProperty(member) && t.isObjectExpression(member.value))) {
        console.warn(`Computed property ${utils_1.literalKey(member.key)} is not an Object.`);
        return [utils_1.todoMethod(member, 'get')];
    }
    const getter = utils_1.findProperty(member.value, 'get');
    const getterMethod = getter ? asis_1.maybeConvertMethod(getter, 'get', member) : null;
    if (!getterMethod) {
        console.warn(`Computed property ${utils_1.literalKey(member.key)} does not have a valid getter.`);
        return [utils_1.todoMethod(getter || member, 'get', member)];
    }
    const setter = utils_1.findProperty(member.value, 'set');
    let setterMethod = setter ? asis_1.maybeConvertMethod(setter, 'set', member) : null;
    if (setter && !setterMethod) {
        console.warn(`Computed property ${utils_1.literalKey(member.key)} has invalid setter.`);
        setterMethod = utils_1.todoMethod(setter, 'set', member);
    }
    comments_1.copyParentNodeComments({ leading: getterMethod, trailing: setterMethod || getterMethod, parent: member });
    return setterMethod ? [getterMethod, setterMethod] : [getterMethod];
}
