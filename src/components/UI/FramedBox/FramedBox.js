import React from 'react';

import './FramedBox.css';

const FramedBox = ({ children, title }) => (
  <div className="framedBox">
    <h1><span>{title}</span></h1>
    {children}
  </div>
);

export default FramedBox;
