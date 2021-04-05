const ASSET_PATH = process.env.ASSET_PATH || '/public';
const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
  entry: './src/Scripts/app.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jp(e*)g|svg|ogg|mp3)$/,  
        use: [{
            loader: 'url-loader',
            options: {
                name: '[hash]-[name].[ext]'
            } 
        }]
    },
    ]
  },
  resolve: {
    extensions: [ '.ts', '.tsx', '.js' ]
  },
  output: {
    filename: 'app.js',
    path: path.resolve(`${__dirname  }/dist`),
    sourceMapFilename: 'app.js.map',
    publicPath: ASSET_PATH,
  },
  mode: 'development',
  plugins: [new ESLintPlugin()]
};
