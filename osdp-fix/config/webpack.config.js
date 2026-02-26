'use strict';

const { merge } = require('webpack-merge');
const CopyPlugin = require("copy-webpack-plugin");


const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = merge(common, {
  entry: {
    contentScript: PATHS.src + '/contentScript.js',
    background: PATHS.src + '/background.js',
  },
  experiments: {
    topLevelAwait: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/popup.mjs', to: 'popup.mjs' }
      ]
    })
  ]
});

module.exports = config;
