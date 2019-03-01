import React from 'react';

import Card from 'react-bulma-components/lib/components/card';
import Image from 'react-bulma-components/lib/components/image';
import Columns from 'react-bulma-components/lib/components/columns';

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
              src="https://vignette.wikia.nocookie.net/project-pokemon/images/4/47/Placeholder.png/revision/latest?cb=20170330235552&format=original"
              size={128}
            />
          </Card.Content>
        </Card>
      </Columns.Column>
    </Columns>
  </>
);

export default Configuration;
