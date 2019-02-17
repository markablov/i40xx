class OffsetCalculator {
  _offsets = [];
  _changedFromLastUpdate = false;

  get offsets() {
    return this._offsets;
  }

  get updated() {
    return this._changedFromLastUpdate;
  }

  update(){
  }
}

export default OffsetCalculator;
