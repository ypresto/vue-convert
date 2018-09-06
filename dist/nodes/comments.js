"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// See https://github.com/benjamn/recast/issues/159#issuecomment-76021050
function toRecastComment(comment, position = 'leading') {
    const recastType = comment.type === 'BlockComment' ? 'CommentBlock' : 'CommentLine';
    return { type: recastType, value: comment.value, leading: position === 'leading', trailing: position === 'trailing' };
}
exports.toRecastComment = toRecastComment;
/** Destructive method. */
function copyNodeComments(targetNode, sourceNode) {
    const comments = [];
    comments.push(...(sourceNode.leadingComments || []).map(c => toRecastComment(c, 'leading')));
    comments.push(...(sourceNode.innerComments || []).map(c => toRecastComment(c, 'inner')));
    comments.push(...(sourceNode.trailingComments || []).map(c => toRecastComment(c, 'trailing')));
    const recastNode = targetNode;
    recastNode.comments = comments;
    return recastNode;
}
exports.copyNodeComments = copyNodeComments;
function unshiftComment(targetNode, ...comments) {
    const recastNode = targetNode;
    recastNode.comments = comments.concat(recastNode.comments || []);
}
exports.unshiftComment = unshiftComment;
function pushComment(targetNode, ...comments) {
    const recastNode = targetNode;
    recastNode.comments = (recastNode.comments || []).concat(comments);
}
exports.pushComment = pushComment;
function lineComment(text) {
    return {
        type: 'CommentLine',
        value: ` ${text}`,
        leading: true,
        trailing: false
    };
}
exports.lineComment = lineComment;
/**
 * Copy comment of parent node into spread nodes.
 *
 * E.g.
 *
 *   // Foo
 *   {
 *     foo: 1,
 *     bar: 2,
 *     baz: 3
 *   }
 *   // Bar
 *
 * into
 *
 *   // Foo
 *   foo = 1
 *   bar = 2
 *   baz = 3
 *   // Bar
 *
 */
function copyParentNodeComments(args) {
    const { leading, trailing, parent } = args;
    const leadingComments = (parent.leadingComments || []).map(c => toRecastComment(c, 'leading'));
    // NOTE: Inner of parent object. Make them leading of first method.
    const innerComments = (parent.innerComments || []).map(c => toRecastComment(c, 'leading'));
    const trailingComments = (parent.trailingComments || []).map(c => toRecastComment(c, 'trailing'));
    unshiftComment(leading, ...leadingComments.concat(innerComments));
    pushComment(trailing, ...trailingComments);
}
exports.copyParentNodeComments = copyParentNodeComments;
