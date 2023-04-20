import { Button, Notification, Columns, Table, Tag, Level } from 'react-bulma-components';

import { pad, padHex } from '../../utilities/string.js';
import FramedBox from '../UI/FramedBox/FramedBox.js';
import Watchers from './Watchers.js';
import emulator from '../../services/emulator.js';
import compile from '../../services/compiler.js';
import editorStore from '../../stores/editorStore.js';
import compilerStore from '../../stores/compilerStore.js';
import emulatorStore from '../../stores/emulatorStore.js';

/*
 * Compile source code into ROM image and run this image inside emulator
 */
const buildAndRun = (editor, runningMode) => {
  const unsubscribe = compilerStore.subscribe(
    (state) => state.isCompiling,
    (isCompiling, state) => {
      if (isCompiling) {
        return;
      }

      unsubscribe();

      if (!state.errors?.length) {
        emulator.run(state.romDump, runningMode);
        editor.focus();
      }
    },
  );

  compile(editor.getValue());
};

export default function Debugger() {
  const editor = editorStore.useState((state) => state.editor);
  const isCompiling = compilerStore.useState((state) => state.isCompiling);
  const { emulatorError, isRunning, registers, runningMode, selectedRamBank } = emulatorStore.useState(
    (state) => ({
      emulatorError: state.error,
      isRunning: state.isRunning,
      registers: state.registers,
      runningMode: state.runningMode,
      selectedRamBank: state.selectedRamBank,
    }),
  );

  const stack = registers.stack || [];
  const registerPairs = (registers.indexBanks || []).map((indexBank) => indexBank.reduce(
    (acc, reg, idx, ar) => (idx % 2 ? [...acc, [ar[idx - 1], reg]] : acc),
    [],
  ));

  return (
    <>
      { emulatorError && <Notification color="danger">{emulatorError}</Notification> }
      <div className="buttons">
        <Button color="success" disabled={isCompiling || isRunning} onClick={() => buildAndRun(editor, 'run')}>
          Build & Run
        </Button>
        <Button color="info" disabled={isCompiling || isRunning} onClick={() => buildAndRun(editor, 'debug')}>
          Build & Debug
        </Button>
        { isRunning && <Button color="danger" onClick={() => emulator.stop()}>Stop</Button> }
        { isRunning && (runningMode === 'debug') && <Button onClick={() => emulator.stepOver()}>Step over</Button> }
        { isRunning && (runningMode === 'debug') && <Button onClick={() => emulator.stepInto()}>Step into</Button> }
        { isRunning && (runningMode === 'debug') && <Button onClick={() => emulator.continueExec()}>Continue</Button> }
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
                  <td>{padHex(selectedRamBank || 0, 2) }</td>
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
      <Level>
        <FramedBox title="Watchers">
          <Watchers />
        </FramedBox>
      </Level>
    </>
  );
}
