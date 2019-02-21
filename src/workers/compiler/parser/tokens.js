import { Lexer, createToken }  from 'chevrotain';

let tokens = {};

const addToken = (name, options) => tokens[name] = createToken({ name, ...options });

addToken('NewLine', { pattern: /\r?\n/ });
addToken('Comment', { pattern: /(?:#|(?:\/\/))[^\n\r]*/, group: Lexer.SKIPPED });
addToken('WhiteSpace', { pattern: /\s+/, group: Lexer.SKIPPED });
addToken('Text', { pattern: /[^\r\n]+/ });

export default tokens;
