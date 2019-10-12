import { NodeType, Node, NodeMap } from '../nodes'

export const isNode = <T extends Array<NodeType>>(
  node: Node,
  types: T
): node is InstanceType<NodeMap[T[number]]> =>
  types.includes(node.type as NodeType)
