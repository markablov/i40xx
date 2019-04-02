import React, { Component } from 'react';
import { connect } from 'react-redux';
import Button from 'react-bulma-components/lib/components/button';
import Notification from 'react-bulma-components/lib/components/notification';
import Columns from 'react-bulma-components/lib/components/columns';
import Box from 'react-bulma-components/lib/components/box';
import Table from 'react-bulma-components/lib/components/table';
import Tag from 'react-bulma-components/lib/components/tag';

import { pad } from '../../utilities/string.js';
import buildAndRun from '../../redux/actions/buildAndRun.js';

class General extends Component {
  handleBuildAndRun = () => this.props.buildAndRun(this.props.editor.getValue());

  render() {
    const { emulator } = this.props;
    const { running, error, registers } = emulator;
    // amount is always even, so no need to take care for last element
    const registerPairs = (registers.index || []).reduce((acc, reg, idx, ar) => idx % 2 ? [...acc, [ar[idx - 1], reg]] : acc, []);

    return (
      <>
        { emulator.error && <Notification color="danger">{error}</Notification> }
        <div className="buttons">
          <Button color="success" onClick={this.handleBuildAndRun} disabled={running}>Build & Run</Button>
        </div>
        <Columns>
          <Columns.Column size={3}>
            <Box>
              <Table striped={false} bordered={false}>
                <tbody>
                  <tr><td>{pad(registers.pc || 0, 3) }</td><td><Tag>PC</Tag></td></tr>
                  <tr><td>{pad(registers.acc || 0, 2) }</td><td><Tag>AC</Tag></td></tr>
                </tbody>
              </Table>
            </Box>
          </Columns.Column>
          <Columns.Column size={6}>
            <Box>
              <Table striped={false} bordered={false}>
                <tbody>
                  {
                    registerPairs.map(([reg1, reg2], idx) =>
                      <tr key={`reg-${idx}`}>
                        <td>{pad(reg1.toString(16), 2)}</td>
                        <td><Tag>{`RR${pad(idx * 2, 2)}`}</Tag></td>
                        <td>{pad(reg2.toString(16), 2)}</td>
                        <td><Tag>{`RR${pad(idx * 2 + 1, 2)}`}</Tag></td>
                      </tr>
                    )
                  }
                </tbody>
              </Table>
            </Box>
          </Columns.Column>
          <Columns.Column size={3}>
            <Box>
              <Table striped={false} bordered={false}>
                <tbody>
                  {
                    registerPairs.map(([reg1, reg2], idx) =>
                      <tr key={`regPair-${idx}`}><td>{pad(((reg1 << 4) | reg2).toString(16), 2)}</td><td><Tag>{`R${idx}`}</Tag></td></tr>
                    )
                  }
                </tbody>
              </Table>
            </Box>
          </Columns.Column>
        </Columns>
      </>
    );
  }
}

export default connect(state => ({ editor: state.editor, dump: state.dump, emulator: state.emulator }), { buildAndRun })(General);
