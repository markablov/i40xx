import { Lexer, createToken }  from 'chevrotain';

let tokensArr = [], tokensMap = {};

const addToken = (name, options) => tokensArr.push(tokensMap[name] = createToken({ name, ...options }));

addToken('NewLine', { pattern: /\r?\n/ });
addToken('Colon', { pattern: ':' });
addToken('Comment', { pattern: /(?:#|(?:\/\/))[^\n\r]*/, group: Lexer.SKIPPED });
addToken('WhiteSpace', { pattern: /\s+/, group: Lexer.SKIPPED });

const instructions = [
  'NOP', 'RDM', 'RD0', 'RD1', 'RD2', 'RD3', 'RDR', 'WRM', 'WR0', 'WR1', 'WR2',
  'WR3', 'WRR', 'WMP', 'ADM', 'SBM', 'CLB', 'CLC', 'CMC', 'STC', 'CMA', 'IAC',
  'DAC', 'RAL', 'RAR', 'TCC', 'DAA', 'TCS', 'KBP', 'DCL', 'LDM', 'LD', 'XCH',
  'ADD', 'SUB', 'INC', 'BBL', 'JIN', 'SRC', 'FIN', 'JUN', 'JMS', 'JCN', 'ISZ',
  'FIM'
];
instructions.forEach(name => addToken(`Instruction${name}`, { pattern: new RegExp(name, 'i') }));

// important to define label name after keywords, because lexer tries to match first rule from array
// and it could match label first because patterns of instruction names and labels are intersected
addToken('Label', { pattern: /[a-zA-Z]\w*/ });

export { tokensArr as allTokens, tokensMap as Tokens };
