class CPUPins {
}

class CPU {
  registers = {
    pc: 0
  };

  constructor() {
    this._pins = new CPUPins();
  }

  get pins() {
    return this._pins;
  }
}

export default CPU;
