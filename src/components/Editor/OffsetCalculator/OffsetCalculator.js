import instructionLength from './InstructionLength.js';

class OffsetCalculator {
  _instructions = [{ len: 0, offset: 0 }];

  constructor(editor) {
    this.editor = editor;
  }

  offset(row) {
    return this._instructions[row].offset;
  }

  row(offset) {
    return this._instructions.findIndex(instruction => instruction.offset === offset && instruction.len > 0);
  }

  all() {
    return this._instructions;
  }

  update({ action, lines, start: { row: startRow }, end: { row: endRow } }){
    const doc = this.editor.getSession().getDocument();
    let changed = false;

    // calculate length of updated instructions
    if (startRow === endRow) {
      const newInstrLen = instructionLength(doc.getLine(startRow));
      if (newInstrLen !== this._instructions[startRow].len) {
        changed = true;
        this._instructions[startRow].len = newInstrLen;
      }
    } else {
      changed = true;
      if (action === 'insert') {
        this._instructions.splice(startRow + 1, 0, ...Array.from(Array(lines.length - 1), () => ({})));
        for (let i = startRow, end = startRow + lines.length; i < end; i++)
          this._instructions[i].len = instructionLength(doc.getLine(i));
      } else if (action === 'remove') {
        this._instructions.splice(startRow + 1, endRow - startRow);
        this._instructions[startRow].len = instructionLength(doc.getLine(startRow));
      }
    }

    // if any instruction length has been updated or instructions has been added/removed
    // then we need to update offsets for following instructions
    if (changed) {
      for (let i = startRow + 1, end = this._instructions.length; i < end; i++)
        this._instructions[i].offset = this._instructions[i - 1].offset + this._instructions[i - 1].len;
    }

    return changed;
  }
}

export default OffsetCalculator;
