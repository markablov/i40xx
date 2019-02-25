/* global module:true */

// this config is using by jest, but Parcel is not supporting babel.config.js
// so .babelrc is still there

module.exports = api => {
  const isTest = api.env('test');

  return {
    presets: [isTest ? '@babel/preset-env' : '@babel/preset-react'],
    plugins: ['@babel/plugin-proposal-class-properties']
  };
};
