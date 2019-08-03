import * as n from '../ast-nodes'

import { Token } from './tokenizer'
import { NodeWithLoc } from '../nodes/node'
import { createError } from './create-error'
import { Parser } from '.'

export const parseLiteral = (
  p: Parser,
  token: Token = p.read(),
  node: NodeWithLoc = p.startNode()
): n.Literal | null => {
  if (token.type === 'boolean') {
    return p.finishNode(node, 'BooleanLiteral', {
      value: token.value,
    })
  }

  if (token.type === 'string') {
    return p.finishNode(node, 'StringLiteral', {
      value: token.value,
    })
  }

  if (token.type === 'numeric') {
    if (/(ms|s|m|h|d|y)$/.test(token.value)) {
      return p.finishNode(node, 'DurationLiteral', {
        value: token.value,
      })
    }

    if (!Number.isNaN(Number(token.value))) {
      if (token.value.length !== 1 && token.value.startsWith('0')) {
        throw createError(
          p.source,
          'invalid number',
          node.loc.start,
          node.loc.end
        )
      }

      return p.finishNode(node, 'NumericLiteral', {
        value: token.value,
      })
    }

    throw createError(p.source, 'invalid token', node.loc.start, node.loc.end)
  }

  return null
}
