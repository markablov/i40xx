import React, { Component } from 'react';
import { connect } from 'react-redux';
import Card from 'react-bulma-components/lib/components/card';
import Image from 'react-bulma-components/lib/components/image';
import Columns from 'react-bulma-components/lib/components/columns';
import Button from 'react-bulma-components/lib/components/button';
import Notification from 'react-bulma-components/lib/components/notification';
import { Field, Control, Input } from 'react-bulma-components/lib/components/form';

import { configure } from '../../../services/emulator.js';

import CPU4004 from './CPU4004.svg';
import ROM4001 from './ROM4001.svg';

class Configuration extends Component {
  state = {
    cpu: { chip: '4004' },
    rom: { chip: '4001', amount: 1 }
  };

  handleReconfigure = () => configure(this.state);

  handleROMAmountChange = ({ target: { value } }) => this.setState({ rom: Object.assign({}, this.state.rom, { amount: +value }) });

  render(){
    const { configurationError } = this.props;
    const { rom } = this.state;

    return (
      <>
        {configurationError && <Notification color="danger">{configurationError}</Notification>}

        <Columns>
          <Columns.Column>
            <Card>
              <Card.Header>
                <Card.Header.Title>CPU</Card.Header.Title>
              </Card.Header>
              <Card.Content>
                <Button.Group hasAddons={true}>
                  <Button isSelected={true} color="info">i4004</Button>
                  <Button disabled={true}>i4040</Button>
                </Button.Group>
                <Image src={CPU4004} size={128} />
              </Card.Content>
            </Card>
          </Columns.Column>
          <Columns.Column>
            <Card>
              <Card.Header>
                <Card.Header.Title>ROM</Card.Header.Title>
              </Card.Header>
              <Card.Content>
                <Button.Group hasAddons={true}>
                  <Button isSelected={true} color="info">i4001</Button>
                </Button.Group>
                <Image src={ROM4001} size={128} />
                <Field>
                  <Control>
                    <Input placeholder="Amount of ROMs" onChange={this.handleROMAmountChange} size="small" value={rom.amount} />
                  </Control>
                </Field>
              </Card.Content>
            </Card>
          </Columns.Column>
        </Columns>
        <Button color="success" onClick={this.handleReconfigure}>Reconfigure</Button>
      </>
    );
  }
}

export default connect(({ configurationError }) => ({ configurationError }))(Configuration);
