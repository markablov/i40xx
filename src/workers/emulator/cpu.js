class CPUPins {
}

class CPU {
  constructor() {
    this._pins = new CPUPins();
  }

  get pins() {
    return this._pins;
  }
}

export default CPU;
