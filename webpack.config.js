const webpack = require("webpack");
const path = require("path");
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = {
  entry: ["./src/main.ts"],
  plugins: [
    new CompressionPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ["file-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname),
  },
  stats: {
    children: true,
  },
};
