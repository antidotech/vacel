import { traverse } from '../../lib'
import {
  Node,
  Member,
  Identifier,
  SetStatement,
  AddStatement,
  StringLiteral,
} from '../../nodes'
import { isNode } from '../../utils/node'

const variable = (obj: 'req' | 'resp') =>
  new Member({
    base: new Member({
      base: new Identifier({
        name: obj,
      }),
      member: new Identifier({
        name: 'http',
      }),
    }),
    member: new Identifier({
      name: 'Branch-Log',
    }),
  })

// const collectLogs = new FunCallExpression({
//   callee: new Member({
//     base: new Identifier({
//       name: 'std',
//     }),
//     member: new Identifier({
//       name: 'collect',
//     }),
//   }),
// })

export default (ast: Node) => {
  traverse(ast, {
    entry({ node }) {
      if (isNode(node, ['SubroutineStatement'])) {
        const loggerNode =
          node.id.name === 'vcl_deliver'
            ? new SetStatement({
                operator: '=',
                left: variable('resp'),
                right: new StringLiteral({
                  value: 'std.collect(std)',
                }),
              })
            : new AddStatement({
                operator: '=',
                left: variable('req'),
                right: new StringLiteral({ value: node.id.name }),
              })

        node.body.unshift(loggerNode)
      } else if (isNode(node, ['IfStatement'])) {
        const loggerNode = new AddStatement({
          operator: '=',
          left: variable('req'),
          right: new StringLiteral({
            value: node.loc
              ? `${node.loc.start.line}:${node.loc.start.column}`
              : 'synthethic',
          }),
        })

        node.consequent.unshift(loggerNode)
      }
    },
  })
}
