class CPUPins {
  _pins = {
    [SYNC]: 0,
    [CM_ROM]: 1,
    [D0]: 0,
    [D1]: 0,
    [D2]: 0,
    [D3]: 0
  };

  /*
   * Set specified pin to LOW or HIGH (0 or 1)
   */
  setPin(pin, value) {
    this._pins[pin] = value ? 1 : 0;
  }

  /*
   * Assign numeric value to set of pins
   *
   * For example put 0xA to [D0, D1, D2, D3] pins, and you would got D0 = 0, D1 = 1, D2 = 0, D3 = 1
   */
  setPinsData(pins, value) {
    pins.forEach((pin, idx) => this._pins[pin] = value & (1 << idx));
  }

  /*
   * Get value of specified pin
   */
  getPin(pin) {
    return this._pins[pin];
  }

  /*
   * Get numeric value for set of pins
   */
  getPinsData(pins) {
    return pins.reduce((acc, pin, idx) => this._pins[pin] ? (acc | (1 << idx)) : acc, 0);
  }
}

export default CPUPins;

export const SYNC = Symbol('cpu/pins/SYNC');
export const CM_ROM = Symbol('cpu/pins/CM_ROM');
export const D0 = Symbol('cpu/pins/D0');
export const D1 = Symbol('cpu/pins/D1');
export const D2 = Symbol('cpu/pins/D2');
export const D3 = Symbol('cpu/pins/D3');
