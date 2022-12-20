export const SYNC = Symbol('cpu/pins/SYNC');
export const CM_ROM = Symbol('cpu/pins/CM_ROM');
export const CM_RAM0 = Symbol('cpu/pins/CM_RAM0');
export const CM_RAM1 = Symbol('cpu/pins/CM_RAM1');
export const CM_RAM2 = Symbol('cpu/pins/CM_RAM2');
export const CM_RAM3 = Symbol('cpu/pins/CM_RAM3');
export const D0 = Symbol('cpu/pins/D0');
export const D1 = Symbol('cpu/pins/D1');
export const D2 = Symbol('cpu/pins/D2');
export const D3 = Symbol('cpu/pins/D3');

class CPUPins {
  #pins = {
    [SYNC]: 0,
    [CM_ROM]: 1,
    [CM_RAM0]: 1,
    [CM_RAM1]: 0,
    [CM_RAM2]: 0,
    [CM_RAM3]: 0,
    [D0]: 0,
    [D1]: 0,
    [D2]: 0,
    [D3]: 0,
  };

  /*
   * Set specified pin to LOW or HIGH (0 or 1)
   */
  setPin(pin, value) {
    this.#pins[pin] = value ? 1 : 0;
  }

  /*
   * Assign numeric value to set of pins
   *
   * For example put 0xA to [D0, D1, D2, D3] pins, and you would got D0 = 0, D1 = 1, D2 = 0, D3 = 1
   */
  setPinsData(pins, value) {
    for (const [idx, pin] of pins.entries()) {
      this.#pins[pin] = value & (1 << idx);
    }
  }

  /*
   * Get value of specified pin
   */
  getPin(pin) {
    return this.#pins[pin];
  }

  /*
   * Get numeric value for set of pins
   */
  getPinsData(pins) {
    return pins.reduce((acc, pin, idx) => (this.#pins[pin] ? (acc | (1 << idx)) : acc), 0);
  }
}

export default CPUPins;
