"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const t = require("@babel/types");
const comments_1 = require("./comments");
function literalKey(expr) {
    if (t.isIdentifier(expr))
        return expr.name;
    if (t.isStringLiteral(expr))
        return expr.value;
    return null;
}
exports.literalKey = literalKey;
function findProperty(ast, name) {
    if (t.isObjectExpression(ast)) {
        return ast.properties.find(p => t.isObjectProperty(p) && literalKey(p.key) === name);
    }
    else {
        return ast.body.body.find(p => t.isClassProperty(p) && literalKey(p.key) === name);
    }
}
exports.findProperty = findProperty;
function todoNamedProperty(name, expr) {
    // TODO: add body as comment
    return comments_1.copyNodeComments(t.classProperty(t.identifier(`TODO_${name}`), t.nullLiteral()), expr); // TODO: add body as comment
}
exports.todoNamedProperty = todoNamedProperty;
function todoProperty(member, baseMember = member) {
    // TODO: add body as comment
    return comments_1.copyNodeComments(t.classProperty(t.identifier(`TODO_${literalKey(member.key) || 'invalidKey'}`), t.nullLiteral()), member); // TODO: add body as comment
}
exports.todoProperty = todoProperty;
function todoMethod(member, kind = 'method', baseMember = member) {
    // TODO: add body as comment
    return comments_1.copyNodeComments(t.classMethod(kind, t.identifier(`TODO_${literalKey(baseMember.key) || 'invalidKey'}`), [], t.blockStatement([])), member);
}
exports.todoMethod = todoMethod;
function spreadTodoProperty(spread) {
    // TODO: add body as comment
    return comments_1.copyNodeComments(t.classProperty(t.identifier(`TODO_spread_${spread.argument}`), t.nullLiteral()), spread);
}
exports.spreadTodoProperty = spreadTodoProperty;
function spreadTodoMethod(spread, kind = 'method') {
    // TODO: add body as comment
    return comments_1.copyNodeComments(t.classMethod(kind, t.identifier(`TODO_spread_${literalKey(spread.argument) || 'invalidArgument'}`), [], t.blockStatement([])), spread);
}
exports.spreadTodoMethod = spreadTodoMethod;
function todoClassMember(member) {
    switch (member.type) {
        case 'SpreadElement':
            return spreadTodoMethod(member);
        case 'ObjectMethod':
            return todoMethod(member);
        case 'ObjectProperty':
            return todoProperty(member);
    }
}
exports.todoClassMember = todoClassMember;
// TODO: Unit test
function checkThisUsed(expr) {
    let thisUsed = false;
    // TODO: Naive impl. @babel/traverse can skip or stop natively.
    t.traverse(expr, {
        enter: (node, _, state) => {
            if (state.skipNode || state.stop)
                return;
            switch (node.type) {
                case 'FunctionExpression':
                case 'FunctionDeclaration':
                    state.skipNode = node;
                    break;
                case 'ThisExpression':
                    thisUsed = true;
                    state.stop = true;
                    break;
            }
        },
        exit: (node, _, state) => {
            if (state.skipNode === node) {
                state.skipNode = null;
            }
        }
    }, { skipNode: null, stop: false });
    return thisUsed;
}
exports.checkThisUsed = checkThisUsed;
