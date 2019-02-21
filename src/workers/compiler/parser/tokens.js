import { Lexer, createToken }  from 'chevrotain';

export const NewLine = createToken({ name: 'NewLine', pattern: /\r?\n/ });
export const Comment = createToken({ name: 'Comment', pattern: /(?:#|(?:\/\/))[^\n\r]*/, group: Lexer.SKIPPED });
export const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });
export const Text = createToken({ name: 'Text', pattern: /[^\r\n]+/ });
