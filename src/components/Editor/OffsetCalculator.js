class OffsetCalculator {
  _offsets = [];
  _changedFromLastUpdate = false;

  get offsets() {
    return this._offsets;
  }

  update(){
    return false;
  }
}

export default OffsetCalculator;
