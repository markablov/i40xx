import React from 'react';
import Card from 'react-bulma-components/lib/components/card';
import Image from 'react-bulma-components/lib/components/image';
import Columns from 'react-bulma-components/lib/components/columns';
import Button from 'react-bulma-components/lib/components/button';

import CPU4004 from './CPU4004.svg';
import ROM4001 from './ROM4001.svg';

const Configuration = () => (
  <>
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
          </Card.Content>
        </Card>
      </Columns.Column>
    </Columns>
    <Button color="success">Reconfigure</Button>
  </>
);

export default Configuration;
