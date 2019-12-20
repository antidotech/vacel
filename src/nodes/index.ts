import { builders as b } from '../generator'
import { Doc } from 'prettier'

export interface Position {
  offset: number
  line: number
  column: number
}

export interface Location {
  start: Position
  end: Position
}

interface State {
  lineNum: number
}

export type PlainNode<T extends BaseNode> = Omit<T, keyof BaseNode>
export type NodeWithLoc<N extends BaseNode = BaseNode> = N & { loc: Location }

export type NodeClassMap = typeof map
export type NodeType = keyof NodeClassMap
export type NodeMap = {
  [K in keyof NodeClassMap]: InstanceType<NodeClassMap[K]>
}

export type Node =
  | Program
  // abstract base
  | BaseExpression
  | BaseStatement
  // abstract group
  | Literal
  | Expression
  | Statement

export type Literal =
  | BooleanLiteral
  | StringLiteral
  | MultilineLiteral
  | DurationLiteral
  | NumericLiteral

export type Expression =
  | Literal
  | Identifier
  | Ip
  | Member
  | ValuePair
  | BooleanExpression
  | UnaryExpression
  | FunCallExpression
  | ConcatExpression
  | BinaryExpression
  | LogicalExpression

export type Statement =
  | ExpressionStatement
  | IncludeStatement
  | ImportStatement
  | CallStatement
  | DeclareStatement
  | AddStatement
  | SetStatement
  | UnsetStatement
  | ReturnStatement
  | ErrorStatement
  | RestartStatement
  | SyntheticStatement
  | LogStatement
  | IfStatement
  | SubroutineStatement
  | AclStatement
  | BackendStatement
  | TableStatement

const flat = <T>(arr: Array<T>) =>
  arr.reduce((acc, cur) => acc.concat(cur), [] as Array<T>)

const printStatements = (state: State, stmts: Array<BaseStatement>): Doc => {
  const doc = []

  for (const stmt of stmts) {
    if (stmt.loc && stmt.loc.start.line > state.lineNum) {
      let delta = stmt.loc.start.line - state.lineNum
      while (delta--) {
        doc.push(b.hardline)
      }

      state.lineNum = stmt.loc.start.line
    }

    doc.push(stmt.print(state), b.hardline)
    state.lineNum++
  }

  doc.pop()

  return b.concat(doc)
}

export abstract class BaseNode {
  type!: string
  loc?: Location

  next(): Array<Node> {
    return flat(
      Object.values(this).filter(
        (v) => Array.isArray(v) || v instanceof BaseNode
      )
    )
  }

  abstract print(state: State): Doc

  static build<T extends NodeType, N extends NodeMap[T]>(
    node: N,
    values: PlainNode<N>
  ): N {
    Object.setPrototypeOf(node, this.prototype)
    Object.assign(node, values)

    return node
  }
}

export abstract class BaseExpression extends BaseNode {}
export abstract class BaseLiteral extends BaseExpression {}
export abstract class BaseStatement extends BaseNode {}

export class Program extends BaseNode {
  type = 'Program' as const
  body: Array<Statement>

  constructor(obj: PlainNode<Program>) {
    super()

    this.body = obj.body
  }

  print(state: State) {
    return printStatements(state, this.body)
  }
}

export class BooleanLiteral extends BaseLiteral {
  type = 'BooleanLiteral' as const
  value: string

  constructor(obj: PlainNode<BooleanLiteral>) {
    super()

    this.value = obj.value
  }

  print() {
    return this.value as Doc
  }
}

export class StringLiteral extends BaseLiteral {
  type = 'StringLiteral' as const
  value: string

  constructor(obj: PlainNode<StringLiteral>) {
    super()

    this.value = obj.value
  }

  print() {
    return this.value
  }
}

export class MultilineLiteral extends BaseLiteral {
  type = 'MultilineLiteral' as const
  value: string

  constructor(obj: PlainNode<MultilineLiteral>) {
    super()

    this.value = obj.value
  }

  print() {
    return this.value
  }
}

export class DurationLiteral extends BaseLiteral {
  type = 'DurationLiteral' as const
  value: string

  constructor(obj: PlainNode<DurationLiteral>) {
    super()

    this.value = obj.value
  }

  print() {
    return this.value
  }
}

export class NumericLiteral extends BaseLiteral {
  type = 'NumericLiteral' as const
  value: string

  constructor(obj: PlainNode<NumericLiteral>) {
    super()

    this.value = obj.value
  }

  print() {
    return this.value
  }
}

export class Identifier extends BaseExpression {
  type = 'Identifier' as const
  name: string

  constructor(obj: PlainNode<Identifier>) {
    super()

    this.name = obj.name
  }

  print() {
    return this.name
  }
}

export class Ip extends BaseExpression {
  type = 'Ip' as const
  value: string
  cidr?: number

  constructor(obj: PlainNode<Ip>) {
    super()

    this.value = obj.value
    this.cidr = obj.cidr
  }

  print() {
    return this.cidr ? `"${this.value}"/${this.cidr}` : `"${this.value}"`
  }
}

export class Member extends BaseExpression {
  type = 'Member' as const
  base: Identifier | Member
  member: Identifier

  constructor(obj: PlainNode<Member>) {
    super()

    this.base = obj.base
    this.member = obj.member
  }

  print(state: State, { neverBreak = false, broken = false } = {}): Doc {
    const shouldBreak =
      !neverBreak &&
      // break if child is also a Member or if also parent is already broken
      (this.base instanceof Member || broken)

    return b.concat([
      b.group(
        b.concat([
          this.base.print(state, {
            neverBreak,
            broken: shouldBreak,
          }),
          b.indent(
            b.concat([shouldBreak ? b.softline : '', '.', this.member.print()])
          ),
        ])
      ),
    ])
  }
}

export class ValuePair extends BaseExpression {
  type = 'ValuePair' as const
  base: Identifier | Member
  name: Identifier

  constructor(obj: PlainNode<ValuePair>) {
    super()

    this.base = obj.base
    this.name = obj.name
  }

  print(state: State) {
    return b.concat([this.base.print(state), ':', this.name.print()])
  }
}

export class BooleanExpression extends BaseExpression {
  type = 'BooleanExpression' as const
  body: Expression

  constructor(obj: PlainNode<BooleanExpression>) {
    super()

    this.body = obj.body
  }

  print(state: State): Doc {
    return b.group(
      b.concat([
        b.indent(
          b.concat(['(', b.ifBreak(b.softline, ''), this.body.print(state)])
        ),
        b.ifBreak(b.softline, ''),
        ')',
      ])
    )
  }
}

export class UnaryExpression extends BaseExpression {
  type = 'UnaryExpression' as const
  operator: string
  argument: Expression

  constructor(obj: PlainNode<UnaryExpression>) {
    super()

    this.operator = obj.operator
    this.argument = obj.argument
  }

  print(state: State): Doc {
    return b.concat([this.operator, this.argument.print(state)])
  }
}

export class FunCallExpression extends BaseExpression {
  type = 'FunCallExpression' as const
  callee: Member | Identifier | ValuePair
  arguments: Array<Expression>

  constructor(obj: PlainNode<FunCallExpression>) {
    super()

    this.callee = obj.callee
    this.arguments = obj.arguments
  }

  print(state: State): Doc {
    return b.concat([
      this.callee.print(state),
      '(',
      b.group(
        b.concat([
          b.indent(
            b.concat([
              b.ifBreak(b.line, ''),
              b.join(
                b.concat([',', b.line]),
                this.arguments.map((n) => n.print(state))
              ),
              b.ifBreak(',', ''),
            ])
          ),
          b.ifBreak(b.line, ''),
        ])
      ),
      ')',
    ])
  }
}

export class ConcatExpression extends BaseExpression {
  type = 'ConcatExpression' as const
  body: Array<Expression>

  constructor(obj: PlainNode<ConcatExpression>) {
    super()

    this.body = obj.body
  }

  print(state: State): Doc {
    return b.group(
      b.indent(
        b.join(
          b.line,
          this.body.map((n) => n.print(state))
        )
      )
    )
  }
}

export class BinaryExpression extends BaseExpression {
  type = 'BinaryExpression' as const
  left: Expression
  right: Expression
  operator: string

  constructor(obj: PlainNode<BinaryExpression>) {
    super()

    this.left = obj.left
    this.right = obj.right
    this.operator = obj.operator
  }

  print(state: State): Doc {
    const left =
      this.left instanceof BinaryExpression
        ? b.concat(['(', this.left.print(state), ')'])
        : this.left.print(state)

    return b.group(
      b.concat([
        left,
        ' ',
        b.indent(b.concat([this.operator, b.line, this.right.print(state)])),
      ])
    )
  }
}

export class LogicalExpression extends BaseExpression {
  type = 'LogicalExpression' as const
  left: Expression
  right: Expression
  operator: string

  constructor(obj: PlainNode<LogicalExpression>) {
    super()

    this.left = obj.left
    this.right = obj.right
    this.operator = obj.operator
  }

  print(state: State): Doc {
    const left =
      this.left instanceof LogicalExpression &&
      this.operator === '||' &&
      this.left.operator === '&&'
        ? b.concat(['(', this.left.print(state), ')'])
        : this.left.print(state)

    const right =
      this.right instanceof LogicalExpression &&
      this.operator === '||' &&
      this.right.operator === '&&'
        ? b.concat(['(', this.right.print(state), ')'])
        : this.right.print(state)

    return b.group(
      b.concat([left, ' ', b.indent(b.concat([this.operator, b.line, right]))])
    )
  }
}

export class ExpressionStatement extends BaseStatement {
  type = 'ExpressionStatement' as const
  body: Expression

  constructor(obj: PlainNode<ExpressionStatement>) {
    super()

    this.body = obj.body
  }

  print(state: State): Doc {
    return b.concat([this.body.print(state), ';'])
  }
}

export class IncludeStatement extends BaseStatement {
  type = 'IncludeStatement' as const
  module: StringLiteral

  constructor(obj: PlainNode<IncludeStatement>) {
    super()

    this.module = obj.module
  }

  print() {
    return b.concat(['include ', this.module.print(), ';'])
  }
}

export class ImportStatement extends BaseStatement {
  type = 'ImportStatement' as const
  module: Identifier

  constructor(obj: PlainNode<ImportStatement>) {
    super()

    this.module = obj.module
  }

  print() {
    return b.concat(['import ', this.module.print(), ';'])
  }
}

export class CallStatement extends BaseStatement {
  type = 'CallStatement' as const
  subroutine: Identifier

  constructor(obj: PlainNode<CallStatement>) {
    super()

    this.subroutine = obj.subroutine
  }

  print() {
    return b.concat(['call ', this.subroutine.print(), ';'])
  }
}

export type DeclareValueType =
  | 'STRING'
  | 'BOOL'
  | 'BOOLEAN'
  | 'INTEGER'
  | 'FLOAT'

export class DeclareStatement extends BaseStatement {
  type = 'DeclareStatement' as const
  id: Identifier | Member
  valueType: DeclareValueType

  constructor(obj: PlainNode<DeclareStatement>) {
    super()

    this.id = obj.id
    this.valueType = obj.valueType
  }

  print(state: State) {
    return b.concat([
      'declare ',
      'local ',
      this.id.print(state, { neverBreak: true }),
      ' ',
      this.valueType,
      ';',
    ])
  }
}

export class AddStatement extends BaseStatement {
  type = 'AddStatement' as const
  left: Identifier | Member
  right: Expression
  operator: string

  constructor(obj: PlainNode<AddStatement>) {
    super()

    this.left = obj.left
    this.right = obj.right
    this.operator = obj.operator
  }

  print(state: State) {
    return b.group(
      b.indent(
        b.concat([
          'add ',
          this.left.print(state, { neverBreak: true }),
          ' ',
          this.operator,
          b.line,
          this.right.print(state, { neverBreak: true }),
          ';',
        ])
      )
    )
  }
}

export class SetStatement extends BaseStatement {
  type = 'SetStatement' as const
  left: Identifier | Member
  right: Expression
  operator: string

  constructor(obj: PlainNode<SetStatement>) {
    super()

    this.left = obj.left
    this.right = obj.right
    this.operator = obj.operator
  }

  print(state: State) {
    return b.group(
      b.indent(
        b.concat([
          'set ',
          this.left.print(state, { neverBreak: true }),
          ' ',
          this.operator,
          b.line,
          this.right.print(state, { neverBreak: true }),
          ';',
        ])
      )
    )
  }
}

export class UnsetStatement extends BaseStatement {
  type = 'UnsetStatement' as const
  id: Identifier | Member

  constructor(obj: PlainNode<UnsetStatement>) {
    super()

    this.id = obj.id
  }

  print(state: State) {
    return b.concat(['unset ', this.id.print(state, { neverBreak: true }), ';'])
  }
}

export type ReturnActionName =
  | 'pass'
  | 'hit_for_pass'
  | 'lookup'
  | 'pipe'
  | 'deliver'

export class ReturnStatement extends BaseStatement {
  type = 'ReturnStatement' as const
  action: ReturnActionName

  constructor(obj: PlainNode<ReturnStatement>) {
    super()

    this.action = obj.action
  }

  print() {
    // TODO: handle the optional parens
    return b.concat(['return ', '(', this.action, ')', ';'])
  }
}

export class ErrorStatement extends BaseStatement {
  type = 'ErrorStatement' as const
  status: number
  message?: Expression

  constructor(obj: PlainNode<ErrorStatement>) {
    super()

    this.status = obj.status
    this.message = obj.message
  }

  print(state: State) {
    return b.concat([
      b.join(
        ' ',
        [
          'error',
          this.status.toString(),
          this.message && this.message.print(state),
        ].filter(Boolean) as Array<Doc>
      ),
      ';',
    ])
  }
}

export class RestartStatement extends BaseStatement {
  type = 'RestartStatement' as const

  constructor(/* obj: PlainNode<RestartStatement> */) {
    super()
  }

  print() {
    return 'restart;'
  }
}

export class SyntheticStatement extends BaseStatement {
  type = 'SyntheticStatement' as const
  response: Expression

  constructor(obj: PlainNode<SyntheticStatement>) {
    super()

    this.response = obj.response
  }

  print(state: State) {
    return b.concat(['synthetic ', this.response.print(state), ';'])
  }
}

export class LogStatement extends BaseStatement {
  type = 'LogStatement' as const
  content: Expression

  constructor(obj: PlainNode<LogStatement>) {
    super()

    this.content = obj.content
  }

  print(state: State) {
    return b.concat(['log ', this.content.print(state), ';'])
  }
}

export class IfStatement extends BaseStatement {
  type = 'IfStatement' as const
  test: Expression
  consequent: Array<Statement>
  alternative?: IfStatement | Array<Statement>

  constructor(obj: PlainNode<IfStatement>) {
    super()

    this.test = obj.test
    this.consequent = obj.consequent
    this.alternative = obj.alternative
  }

  print(state: State): Doc {
    const doc = [
      'if ',
      b.group(
        b.concat([
          b.indent(
            b.concat(['(', b.ifBreak(b.hardline, ''), this.test.print(state)])
          ),
          b.ifBreak(b.hardline, ''),
          ') ',
        ])
      ),
      '{',
      b.indent(printStatements(state, this.consequent)),
      b.hardline,
      '}',
    ]

    if (this.alternative) {
      const alternative = Array.isArray(this.alternative)
        ? [
            ' else {',
            b.indent(printStatements(state, this.alternative)),
            b.hardline,
            '}',
          ]
        : [' else ', this.alternative.print(state)]

      return b.concat([...doc, ...alternative])
    }

    return b.concat(doc)
  }
}

export class SubroutineStatement extends BaseStatement {
  type = 'SubroutineStatement' as const
  id: Identifier
  body: Array<Statement>

  constructor(obj: PlainNode<SubroutineStatement>) {
    super()

    this.id = obj.id
    this.body = obj.body
  }

  print(state: State): Doc {
    return b.concat([
      'sub ',
      this.id.print(),
      ' {',
      b.indent(printStatements(state, this.body)),
      b.hardline,
      '}',
    ])
  }
}

export class AclStatement extends BaseStatement {
  type = 'AclStatement' as const
  id: Identifier
  body: Array<Ip>

  constructor(obj: PlainNode<AclStatement>) {
    super()

    this.id = obj.id
    this.body = obj.body
  }

  print() {
    return b.concat([
      'acl ',
      this.id.print(),
      ' {',
      b.indent(
        b.concat([
          b.hardline,
          b.join(
            b.hardline,
            this.body.map((n) => n.print()).map((ip) => b.concat([ip, ';']))
          ),
        ])
      ),
      b.hardline,
      '}',
    ])
  }
}

export class BackendDefinition extends BaseNode {
  type = 'BackendDefinition' as const
  key: string
  value: Expression | Array<BackendDefinition>

  constructor(obj: PlainNode<BackendDefinition>) {
    super()

    this.key = obj.key
    this.value = obj.value
  }

  print(state: State): Doc {
    const printedValue = Array.isArray(this.value)
      ? b.concat([
          '{',
          b.indent(
            b.concat([
              b.hardline,
              b.join(
                b.hardline,
                this.value.map((v) => v.print(state))
              ),
            ])
          ),
          b.hardline,
          '}',
        ])
      : b.concat([this.value.print(state), ';'])

    return b.concat(['.', this.key, ' = ', printedValue])
  }
}

export class BackendStatement extends BaseStatement {
  type = 'BackendStatement' as const
  id: Identifier
  body: Array<BackendDefinition>

  constructor(obj: PlainNode<BackendStatement>) {
    super()

    this.id = obj.id
    this.body = obj.body
  }

  print(state: State) {
    return b.concat([
      'backend ',
      this.id.print(),
      ' ',
      b.concat([
        '{',
        b.indent(
          b.concat([
            b.hardline,
            b.join(
              b.hardline,
              this.body.map((d) => d.print(state))
            ),
          ])
        ),
        b.hardline,
        '}',
      ]),
    ])
  }
}

export class TableDefinition extends BaseNode {
  type = 'TableDefinition' as const
  key: string
  value: string

  constructor(obj: PlainNode<TableDefinition>) {
    super()

    this.key = obj.key
    this.value = obj.value
  }

  print() {
    return b.concat([this.key, ':', this.value])
  }
}

export class TableStatement extends BaseStatement {
  type = 'TableStatement' as const
  id: Identifier
  body: Array<TableDefinition>

  constructor(obj: PlainNode<TableStatement>) {
    super()

    this.id = obj.id
    this.body = obj.body
  }

  print() {
    return b.concat([
      'table ',
      this.id.print(),
      ' {',
      b.indent(
        b.concat([
          b.hardline,
          b.join(
            b.concat([',', b.hardline]),
            this.body.map((td) => td.print())
          ),
          // TODO: handle trailing comma
          // ',',
        ])
      ),
      b.hardline,
      '}',
    ])
  }
}

export const map = {
  Program,
  BooleanLiteral,
  StringLiteral,
  MultilineLiteral,
  DurationLiteral,
  NumericLiteral,
  Identifier,
  Ip,
  Member,
  ValuePair,
  BooleanExpression,
  UnaryExpression,
  FunCallExpression,
  ConcatExpression,
  BinaryExpression,
  LogicalExpression,
  ExpressionStatement,
  IncludeStatement,
  ImportStatement,
  CallStatement,
  DeclareStatement,
  AddStatement,
  SetStatement,
  UnsetStatement,
  ReturnStatement,
  ErrorStatement,
  RestartStatement,
  SyntheticStatement,
  LogStatement,
  IfStatement,
  SubroutineStatement,
  AclStatement,
  BackendDefinition,
  BackendStatement,
  TableDefinition,
  TableStatement,
} as const
