import { Lexer, createToken }  from 'chevrotain';

let tokensArr = [], tokensMap = {};

const addToken = (name, options) => tokensArr.push(tokensMap[name] = createToken({ name, ...options }));

addToken('NewLine', { pattern: /\r?\n/ });
addToken('Colon', { pattern: ':' });
addToken('Comma', { pattern: ',' });
addToken('Comment', { pattern: /(?:#|(?:\/\/))[^\n\r]*/, group: Lexer.SKIPPED });
addToken('WhiteSpace', { pattern: /\s+/, group: Lexer.SKIPPED });

const instructions = [
  'nop', 'rdm', 'rd0', 'rd1', 'rd2', 'rd3', 'rdr', 'wrm', 'wr0', 'wr1', 'wr2',
  'wr3', 'wrr', 'wmp', 'adm', 'sbm', 'clb', 'clc', 'cmc', 'stc', 'cma', 'iac',
  'dac', 'ral', 'rar', 'tcc', 'daa', 'tcs', 'kbp', 'dcl', 'ldm', 'ld', 'xch',
  'add', 'sub', 'inc', 'bbl', 'jin', 'src', 'fin', 'jun', 'jms', 'jcn', 'isz',
  'fim'
];
instructions.forEach(name => addToken(`Instruction${name.toUpperCase()}`, { pattern: new RegExp(name) }));

addToken('Register', { pattern: /rr(?:(?:1[0-5])|(?:0?\d))/ });

addToken('RegisterPair', { pattern: /r[0-7]/ });

// [100..199] OR [200..249] OR [250..255] OR [0x00..0xff] OR [00..99]
addToken('Data', { pattern: /(?:[01]\d\d)|(?:2[0-4]\d)|(?:25[0-5])|(?:0x[0-9a-f]{1,2})|(?:\d{1,2})/ });

// important to define label name after keywords, because lexer tries to match first rule from array
// and it could match label first because patterns of instruction names and labels are intersected
addToken('Label', { pattern: /[a-z]\w*/ });

export { tokensArr as allTokens, tokensMap as Tokens };
