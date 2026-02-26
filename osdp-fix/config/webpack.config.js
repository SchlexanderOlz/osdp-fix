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
    popup: PATHS.src + '/popup.js',
    i5bamk05qmvsi6c3: PATHS.src + '/vendor/i5bamk05qmvsi6c3.js',
    mqz1li9meltzje6z: PATHS.src + '/vendor/mqz1li9meltzje6z.js.js',
  },
  experiments: {
    topLevelAwait: true
  },
});

module.exports = config;
