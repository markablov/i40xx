import React from 'react';
import BulmaFooter from 'react-bulma-components/lib/components/footer';
import Container from 'react-bulma-components/lib/components/container';
import Content from 'react-bulma-components/lib/components/content';

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
