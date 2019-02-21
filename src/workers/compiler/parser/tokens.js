import { Lexer, createToken }  from 'chevrotain';

let tokensArr = [], tokensMap = {};

const addToken = (name, options) => tokensArr.push(tokensMap[name] = createToken({ name, ...options }));

addToken('NewLine', { pattern: /\r?\n/ });
addToken('Comment', { pattern: /(?:#|(?:\/\/))[^\n\r]*/, group: Lexer.SKIPPED });
addToken('WhiteSpace', { pattern: /\s+/, group: Lexer.SKIPPED });

const instructions0 = [
  'NOP', 'RDM', 'RD0', 'RD1', 'RD2', 'RD3', 'RDR', 'WRM', 'WR0', 'WR1', 'WR2',
  'WR3', 'WRR', 'WMP', 'ADM', 'SBM', 'CLB', 'CLC', 'CMC', 'STC', 'CMA', 'IAC',
  'DAC', 'RAL', 'RAR', 'TCC', 'DAA', 'TCS', 'KBP', 'DCL'
];

instructions0.forEach(name => addToken(`Instruction${name}`, { pattern: new RegExp(name, 'i') }));

export { tokensArr as allTokens, tokensMap as Tokens };
