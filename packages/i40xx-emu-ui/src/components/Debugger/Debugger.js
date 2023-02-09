import { useSelector, useDispatch } from 'react-redux';
import { Button, Notification, Columns, Table, Tag } from 'react-bulma-components';

import { pad, padHex } from '../../utilities/string.js';
import buildAndRun from '../../redux/actions/buildAndRun.js';
import FramedBox from '../UI/FramedBox/FramedBox.js';
import { stop, stepInto, stepOver, continueExec } from '../../services/emulator.js';
import editorStore from '../../stores/editorStore.js';

export default function Debugger() {
  const dispatch = useDispatch();
  const emulator = useSelector((state) => state.emulator);
  const editor = editorStore.useState((state) => state.editor);

  const { error, mode, registers, running, selectedBank } = emulator;
  const stack = registers.stack || [];
  const registerPairs = (registers.indexBanks || []).map((indexBank) => indexBank.reduce(
    (acc, reg, idx, ar) => (idx % 2 ? [...acc, [ar[idx - 1], reg]] : acc),
    [],
  ));

  return (
    <>
      { emulator.error && <Notification color="danger">{error}</Notification> }
      <div className="buttons">
        <Button color="success" disabled={running} onClick={() => dispatch(buildAndRun(editor.getValue(), 'run'))}>
          Build & Run
        </Button>
        <Button color="info" disabled={running} onClick={() => dispatch(buildAndRun(editor.getValue(), 'debug'))}>
          Build & Debug
        </Button>
        { running && <Button color="danger" onClick={() => stop()}>Stop</Button> }
        { running && (mode === 'debug') && <Button onClick={() => stepOver()}>Step over</Button> }
        { running && (mode === 'debug') && <Button onClick={() => stepInto()}>Step into</Button> }
        { running && (mode === 'debug') && <Button onClick={() => continueExec()}>Continue</Button> }
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
