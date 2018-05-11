const {DefinePlugin} = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const path = require('path');


const isWatch = process.argv.some(function (arg) {
  return arg === '--watch';
});

const outputPath = path.resolve('../app/src/main/assets');

const env = {
  targets: {
    browsers: ['Chrome >= 60']
  }
};

const config = {
  entry: {
    index: './src/js/index',
  },
  output: {
    path: outputPath,
    filename: 'js/[name].js'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['env', env]
            ]
          }
        }
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(outputPath, {
      allowExternal: true
    }),
    new CopyWebpackPlugin([
      {from: './src/index.html'}
    ]),
    new DefinePlugin({
      'process.env': {
        'DEBUG': JSON.stringify('*')
      }
    }),
  ]
};

if (!isWatch) {
  config.devtool = 'none';
  Object.keys(config.entry).forEach(entryName => {
    let value = config.entry[entryName];
    if (!Array.isArray(value)) {
      value = [value];
    }

    value.unshift(
      'core-js/fn/promise',
      'whatwg-fetch',
    );

    config.entry[entryName] = value;
  });
}

module.exports = config;