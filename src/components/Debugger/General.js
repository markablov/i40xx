import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button, Notification, Columns, Table, Tag } from 'react-bulma-components';

import { pad, padHex } from '../../utilities/string.js';
import buildAndRunAction from '../../redux/actions/buildAndRun.js';
import FramedBox from '../UI/FramedBox/FramedBox.js';
import { stop, stepInto, stepOver, continueExec } from '../../services/emulator.js';

class General extends Component {
  state = { showDebugButtons: false };

  componentDidUpdate() {
    const { props: { emulator: { running } }, state: { showDebugButtons } } = this;

    if (!running && showDebugButtons) {
      this.setState({ showDebugButtons: false });
    }
  }

  handleBuildAndRun = () => {
    const { buildAndRun, editor } = this.props;
    buildAndRun(editor.getValue(), 'run');
  };

  handleBuildAndDebug = () => {
    const { buildAndRun, editor } = this.props;
    buildAndRun(editor.getValue(), 'debug');
  };

  static handleStop() {
    stop();
  }

  static handleStepInto() {
    stepInto();
  }

  static handleStepOver() {
    stepOver();
  }

  static handleContinue() {
    continueExec();
  }

  render() {
    const { emulator } = this.props;
    const { showDebugButtons } = this.state;
    const { error, mode, registers, running, selectedBank } = emulator;

    // amount is always even, so no need to take care for last element
    const registerPairs = (registers.indexBanks || []).map((indexBank) => indexBank.reduce(
      (acc, reg, idx, ar) => (idx % 2 ? [...acc, [ar[idx - 1], reg]] : acc),
      [],
    ));

    const stack = registers.stack || [];

    // prevent flickering for quick execution sessions
    if (running && !this.delayedButtonDisplayer) {
      this.delayedButtonDisplayer = setTimeout(() => {
        const { props: { emulator: { running: currentRunning } }, state: { showDebugButtons: currentDebug } } = this;
        if (currentRunning && !currentDebug) {
          this.setState({ showDebugButtons: true });
        }
        this.delayedButtonDisplayer = null;
      }, 500);
    }

    return (
      <>
        { emulator.error && <Notification color="danger">{error}</Notification> }
        <div className="buttons">
          <Button color="success" disabled={running} onClick={this.handleBuildAndRun}>Build & Run</Button>
          <Button color="info" disabled={running} onClick={this.handleBuildAndDebug}>Build & Debug</Button>
          { showDebugButtons && <Button color="danger" onClick={General.handleStop}>Stop</Button> }
          { showDebugButtons && (mode === 'debug') && <Button onClick={General.handleStepOver}>Step over</Button> }
          { showDebugButtons && (mode === 'debug') && <Button onClick={General.handleStepInto}>Step into</Button> }
          { showDebugButtons && (mode === 'debug') && <Button onClick={General.handleContinue}>Continue</Button> }
        </div>
        <Columns>
          <Columns.Column size={3}>
            <FramedBox title="Miscellaneous">
              <Table bordered={false} size="narrow" striped={false}>
                <tbody>
                  <tr>
                    <td>{padHex(registers.acc || 0, 2) }</td>
                    <td><Tag>ACC</Tag></td>
                  </tr>
                  <tr>
                    <td>{padHex(registers.carry || 0, 2) }</td>
                    <td><Tag>CY</Tag></td>
                  </tr>
                  <tr>
                    <td>{padHex(selectedBank || 0, 2) }</td>
                    <td><Tag>Mem bank</Tag></td>
                  </tr>
                  <tr>
                    <td>{padHex(registers.selectedRegisterBank || 0, 2) }</td>
                    <td><Tag>Reg bank</Tag></td>
                  </tr>
                  <tr>
                    <td>{padHex(registers.pc || 0, 3) }</td>
                    <td><Tag>PC</Tag></td>
                  </tr>
                  <tr>
                    <td>{padHex(registers.sp || 0, 2) }</td>
                    <td><Tag>SP</Tag></td>
                  </tr>
                  {
                    stack.map((stackValue, idx) => (
                      <tr key={`stack-${idx}`}>
                        <td>{padHex(stackValue || 0, 3) }</td>
                        <td><Tag>{`S${idx}`}</Tag></td>
                      </tr>
                    ))
                  }
                </tbody>
              </Table>
            </FramedBox>
          </Columns.Column>
          <Columns.Column size={6}>
            {
              registerPairs.map((indexBank, bankIdx) => (
                <FramedBox key={`reg-bank-${bankIdx}`} active={bankIdx === registers.selectedRegisterBank} title={`Registers #${bankIdx}`}>
                  <Table bordered={false} striped={false}>
                    <tbody>
                      {
                        indexBank.map(([reg1, reg2], idx) => (
                          <tr key={`reg-${bankIdx}-${idx}`}>
                            <td>{padHex(reg1, 2)}</td>
                            <td><Tag>{`RR${pad(idx * 2, 2)}`}</Tag></td>
                            <td>{padHex(reg2, 2)}</td>
                            <td><Tag>{`RR${pad(idx * 2 + 1, 2)}`}</Tag></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </Table>
                </FramedBox>
              ))
            }
          </Columns.Column>
          <Columns.Column size={3}>
            {
              registerPairs.map((indexBank, bankIdx) => (
                <FramedBox key={`regPair-bank-${bankIdx}`} active={bankIdx === registers.selectedRegisterBank} title={`Register pairs #${bankIdx}`}>
                  <Table bordered={false} striped={false}>
                    <tbody>
                      {
                        indexBank.map(([reg1, reg2], idx) => (
                          <tr key={`regPair-${bankIdx}-${idx}`}>
                            <td>{padHex((reg1 << 4) | reg2, 2)}</td>
                            <td><Tag>{`R${idx}`}</Tag></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </Table>
                </FramedBox>
              ))
            }
          </Columns.Column>
        </Columns>
      </>
    );
  }
}

General.propTypes = {
  buildAndRun: PropTypes.func.isRequired,
  editor: PropTypes.shape({ getValue: PropTypes.func }),

  emulator: PropTypes.shape({
    error: PropTypes.string,
    mode: PropTypes.string,
    registers: PropTypes.shape({
      acc: PropTypes.number,
      carry: PropTypes.number,
      indexBanks: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
      pc: PropTypes.number,
      selectedRegisterBank: PropTypes.number,
      sp: PropTypes.number,
      stack: PropTypes.arrayOf(PropTypes.number),
    }),
    running: PropTypes.bool,
    selectedBank: PropTypes.number,
  }).isRequired,
};

General.defaultProps = {
  editor: null,
};

const mapFn = connect(
  (state) => ({ editor: state.editor, emulator: state.emulator }),
  { buildAndRun: buildAndRunAction },
);

export default mapFn(General);
