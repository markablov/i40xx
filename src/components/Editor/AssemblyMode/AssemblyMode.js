import 'brace/mode/text';

import HighlightRules from './HighlightRules.js';

class AssemblyMode extends window.ace.acequire('ace/mode/text').Mode {
  constructor() {
    super();
    this.HighlightRules = HighlightRules;
    this.$id = 'assembly_i4004';
  }
}

export default AssemblyMode;
