const chalk = require("chalk");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const openBrowser = require("react-dev-utils/openBrowser");
const { prepareUrls } = require("react-dev-utils/WebpackDevServerUtils");
const getWebpackConfig = require("../webpack.config");
const { name: appName } = require("../package.json");
const getHostConfig = require("../config/host.js");

const NODE_ENV = (process.env.NODE_ENV = "development");

const { isMock } = process.env;

const { HOST, PORT } = getHostConfig();

const protocol = process.env.HTTPS === "true" ? "https" : "http";

const urls = prepareUrls(protocol, HOST, PORT);

const devServer = {
  host: HOST,
  port: PORT,
  hot: true,
  open: false,
  allowedHosts: "all",
  https: protocol === "https",
  compress: true,
  client: {
    // webSocketTransport: "ws",
    overlay: true,
  },
  devMiddleware: {
    stats: "errors-warnings",
  },
  // webSocketServer: "ws",
  historyApiFallback: {
    // Paths with dots should still use the history fallback.
    // See https://github.com/facebook/create-react-app/issues/387.
    disableDotRule: true,
    index: "/",
  },
  proxy: {
    "/api": {
      target: isMock
        ? "http://localhost:4000"
        : "http://10.64.200.237:9988/disposal",
      secure: false,
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
    },
  },
};
function printInstructions(appName, urls) {
  console.log();
  console.log(
    chalk.blue(`You can view ${chalk.bold(appName)} in the browser.`)
  );
  console.log();
  urls.localUrlForTerminal &&
    console.log(`  ${chalk.bold("Local:")}  ${urls.localUrlForTerminal}`);
  urls.lanUrlForTerminal &&
    console.log(
      `  ${chalk.bold("On Your Network:")}  ${urls.lanUrlForTerminal}`
    );
  console.log();
}

const compiler = webpack(getWebpackConfig({ NODE_ENV }));
let isFirstCompile = true;

compiler.hooks.done.tap("done", async (stats) => {
  if (stats.hasErrors()) {
    return;
  }
  if (isFirstCompile) {
    printInstructions(appName, urls);
    isFirstCompile = false;
  }
});

const server = new WebpackDevServer(devServer, compiler);

server.startCallback((error) => {
  if (error) {
    console.log(error);
  } else {
    openBrowser(urls.localUrlForBrowser);
    ["SIGINT", "SIGTERM"].forEach(function (sig) {
      process.on(sig, function () {
        server.close();
        process.exit();
      });
    });
    process.stdin.on("end", function () {
      server.close();
      process.exit();
    });
  }
});
