class Tokenizer extends window.ace.acequire('ace/tokenizer').Tokenizer {
  getLineTokens(line, startState) {
    return super.getLineTokens(line, startState);
  }
}

export default Tokenizer;
