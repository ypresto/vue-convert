import * as t from '@babel/types'

// Maybe t.BaseComment is old definition of
export interface RecastComment {
  type: 'CommentBlock' | 'CommentLine'
  value: string
  leading: boolean
  trailing: boolean
}

interface RecastNodeWithComment {
  comments?: RecastComment[] | null
}

// See https://github.com/benjamn/recast/issues/159#issuecomment-76021050
export function toRecastComment(
  comment: t.Comment,
  position: 'leading' | 'inner' | 'trailing' = 'leading'
): RecastComment {
  const recastType = comment.type === 'BlockComment' ? 'CommentBlock' : 'CommentLine'
  return { type: recastType, value: comment.value, leading: position === 'leading', trailing: position === 'trailing' }
}

/** Destructive method. */
export function copyNodeComments<T extends t.BaseNode>(targetNode: T, sourceNode: t.BaseNode): T {
  const comments: RecastComment[] = []
  comments.push(...(sourceNode.leadingComments || []).map(c => toRecastComment(c, 'leading')))
  comments.push(...(sourceNode.innerComments || []).map(c => toRecastComment(c, 'inner')))
  comments.push(...(sourceNode.trailingComments || []).map(c => toRecastComment(c, 'trailing')))
  const recastNode = targetNode as T & RecastNodeWithComment
  recastNode.comments = comments
  return recastNode
}

export function unshiftComment(targetNode: t.BaseNode, ...comments: RecastComment[]): void {
  const recastNode = targetNode as RecastNodeWithComment
  recastNode.comments = comments.concat(recastNode.comments || [])
}

export function pushComment(targetNode: t.BaseNode, ...comments: RecastComment[]): void {
  const recastNode = targetNode as RecastNodeWithComment
  recastNode.comments = (recastNode.comments || []).concat(comments)
}

export function lineComment(text: string): RecastComment {
  return {
    type: 'CommentLine',
    value: ` ${text}`,
    leading: true,
    trailing: false
  }
}

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
export function copyParentNodeComments(args: { leading: t.BaseNode; trailing: t.BaseNode; parent: t.BaseNode }) {
  const { leading, trailing, parent } = args

  const leadingComments = (parent.leadingComments || []).map(c => toRecastComment(c, 'leading'))
  // NOTE: Inner of parent object. Make them leading of first method.
  const innerComments = (parent.innerComments || []).map(c => toRecastComment(c, 'leading'))
  const trailingComments = (parent.trailingComments || []).map(c => toRecastComment(c, 'trailing'))
  unshiftComment(leading, ...leadingComments.concat(innerComments))
  pushComment(trailing, ...trailingComments)
}
