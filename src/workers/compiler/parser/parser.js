import { createToken, Lexer }  from 'chevrotain';

const NewLine = createToken({ name: 'NewLine', pattern: /\r?\n/ });
const Comment = createToken({ name: 'Comment', pattern: /(?:#|(?:\/\/))[^\n\r]*/, group: Lexer.SKIPPED });
const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });
const Text = createToken({ name: 'Text', pattern: /[^\r\n]+/ });

const tokenList = [NewLine, Comment, WhiteSpace, Text];

const AsmLexer = new Lexer(tokenList);

const parse = sourceCode => {
  const { tokens } = AsmLexer.tokenize(sourceCode);
  return tokens;
};

export default parse;
