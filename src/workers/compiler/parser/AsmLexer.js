import { Lexer }  from 'chevrotain';

import { allTokens } from './tokens.js';

export default new Lexer(allTokens);
