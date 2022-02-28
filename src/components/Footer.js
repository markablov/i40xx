import React from 'react';
import { Footer as BulmaFooter, Container, Content } from 'react-bulma-components';

const Footer = () => (
  <BulmaFooter>
    <Container>
      <Content style={{ textAlign: 'center' }}>
        <p>
          Mark Ablovatskii, <a href="mailto:mark.ablov@gmail.com">mark.ablov@gmail.com</a>
        </p>
      </Content>
    </Container>
  </BulmaFooter>
);

export default Footer;
