import React from 'react';
import Section from 'react-bulma-components/lib/components/section';
import Container from 'react-bulma-components/lib/components/container';
import Columns from 'react-bulma-components/lib/components/columns';

import Editor from '../components/Editor/Editor.js';
import Debugger from '../components/Debugger/Debugger.js';

import './Root.css';

const Root = () => (
  <Section>
    <Container>
      <Columns>
        <Columns.Column>
          <Editor />
        </Columns.Column>
        <Columns.Column>
          <Debugger />
        </Columns.Column>
      </Columns>
    </Container>
  </Section>
);

export default Root;
