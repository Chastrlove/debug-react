const paths = require("path");

const fs = require("fs");

const resolveApp = (relativePath) => paths.resolve(appDirectory, relativePath);

const appDirectory = fs.realpathSync(process.cwd());

module.exports = {
  appDirectory: appDirectory,
  appBuild: resolveApp("dist"),
  config: resolveApp("config"),
  scripts: resolveApp("scripts"),
  webpackPath: resolveApp("webpack.config.js"),
  src: resolveApp("src"),
  appHtml: resolveApp("index.html"),
  appIndexJs: resolveApp("src/main.tsx"),
  appPublic: resolveApp("public"),
  appWebpackCache: resolveApp("node_modules/.cache"),
  appTsConfig: resolveApp("tsconfig.json"),
  appPackageJson: resolveApp("package.json"),
  appNodeModules: resolveApp("node_modules"),
  babelrc: resolveApp("babel.config.js"),
};
