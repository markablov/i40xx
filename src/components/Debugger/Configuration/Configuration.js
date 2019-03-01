import React from 'react';
import Card from 'react-bulma-components/lib/components/card';
import Image from 'react-bulma-components/lib/components/image';
import Columns from 'react-bulma-components/lib/components/columns';

import CPU4004 from './CPU4004.svg';

const Configuration = () => (
  <>
    <Columns>
      <Columns.Column>
        <Card>
          <Card.Header>
            <Card.Header.Title>CPU</Card.Header.Title>
          </Card.Header>
          <Card.Content>
            <Image
              src={CPU4004}
              size={128}
            />
          </Card.Content>
        </Card>
      </Columns.Column>
    </Columns>
  </>
);

export default Configuration;
