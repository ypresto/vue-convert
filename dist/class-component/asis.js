"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const t = require("@babel/types");
const utils_1 = require("../nodes/utils");
const comments_1 = require("../nodes/comments");
function convertGenericProperty(member) {
    const key = utils_1.literalKey(member.key) || 'TODO_invalidKey';
    const method = maybeConvertMethod(member);
    if (method)
        return [method];
    const property = member;
    if (t.isExpression(property.value)) {
        return [comments_1.copyNodeComments(t.classProperty(t.identifier(key), property.value), property)];
    }
    else {
        console.warn(`Invalid object member of ${key}`);
        return [utils_1.todoProperty(property)];
    }
}
exports.convertGenericProperty = convertGenericProperty;
function maybeConvertMethod(member, kind = 'method', baseMember = member) {
    if (t.isObjectMethod(member)) {
        return comments_1.copyNodeComments(t.classMethod(kind, baseMember.key, member.params, member.body, baseMember.computed), member);
    }
    if (t.isFunctionExpression(member.value)) {
        return comments_1.copyNodeComments(t.classMethod(kind, baseMember.key, member.value.params, member.value.body, baseMember.computed), member);
    }
    if (t.isArrowFunctionExpression(member.value)) {
        const arrowFunc = member.value;
        if (utils_1.checkThisUsed(arrowFunc)) {
            console.warn('Found usage of this in arrow function. It cannot be converted.');
            return null;
        }
        // TODO: Maybe use @babel/traverse's path.arrowFunctionToExpression()
        if (t.isBlockStatement(arrowFunc.body)) {
            return comments_1.copyNodeComments(t.classMethod(kind, baseMember.key, arrowFunc.params, arrowFunc.body), member);
        }
        const body = t.blockStatement([t.returnStatement(arrowFunc.body)]);
        return comments_1.copyNodeComments(t.classMethod(kind, baseMember.key, arrowFunc.params, body), member);
    }
    return null;
}
exports.maybeConvertMethod = maybeConvertMethod;
