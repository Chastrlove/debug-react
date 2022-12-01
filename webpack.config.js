const _ = require("lodash");
const fs = require("fs-extra");
const path = require("path");
const webpack = require("webpack");
const WebpackBar = require("webpackbar");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const createEnvironmentHash = require("./scripts/createEnvironmentHash");
const getHostConfig = require("./config/host");
const {
  appDirectory,
  appNodeModules,
  appTsConfig,
  appWebpackCache,
  appBuild,
  src,
  appIndexJs,
  appPublic,
  appHtml,
} = require("./config/paths");

const paths = require("./config/paths");

/**
 * 获取别名
 */
function getAlias() {
  return _.chain(require(appTsConfig).compilerOptions.paths)
    .mapKeys((item, key) => {
      return _.replace(key, "/*", "");
    })
    .mapValues((item) => {
      return path.join(appDirectory, _.replace(item, "/*", "/"));
    })
    .value();
}

const getWebpackConfig = (webpackEnv) => {
  (webpackEnv = webpackEnv || {}) && !webpackEnv.NODE_ENV && (webpackEnv.NODE_ENV = "development");

  const { publicPath } = getHostConfig();

  const isDev = webpackEnv.NODE_ENV === "development";
  const isPro = webpackEnv.NODE_ENV === "production";

  webpackEnv.PUBLIC_URL = publicPath;

  const shouldUseSourceMap = isDev

  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isDev && require.resolve("style-loader"),
      isPro && {
        loader: MiniCssExtractPlugin.loader,
        options: publicPath.startsWith(".") ? { publicPath: "../" } : {},
      },
      {
        loader: "css-loader",
        options: cssOptions,
      },
      {
        loader: "postcss-loader",
        options: {
          postcssOptions: {
            plugins: [
              ["postcss-flexbugs-fixes"],
              [
                "postcss-preset-env",
                {
                  stage: 3,
                  autoprefixer: { flexbox: "no-2009" },
                  features: {
                    "nesting-rules": true,
                  },
                },
              ],
            ],
          },
        },
      },
    ].filter(Boolean);

    if (preProcessor) {
      loaders.push(preProcessor);
    }
    return loaders;
  };

  return {
    entry: [appIndexJs],
    target: ["browserslist"],
    mode: webpackEnv.NODE_ENV,
    bail: isPro,
    /* experiments: {
      lazyCompilation: {
        entries: false,
        imports: true,
      },
    },*/
    devtool: shouldUseSourceMap ? (isDev ? "cheap-module-source-map" : "source-map") : false,
    cache: {
      type: "filesystem",
      version: createEnvironmentHash(webpackEnv),
      cacheDirectory: appWebpackCache,
      store: "pack",
      buildDependencies: {
        defaultWebpack: ["webpack/lib/"],
        config: [__filename],
        tsconfig: [appTsConfig].filter((f) => fs.existsSync(f)),
      },
    },
    infrastructureLogging: {
      level: "none",
      // debug: /webpack\.cache.*/,
    },
    output: {
      path: appBuild,
      pathinfo: isDev,
      filename: !isDev ? "js/[name].[contenthash:8].js" : "js/[name].js",
      publicPath,
      chunkFilename: !isDev ? "js/[name].[contenthash:8].chunk.js" : "js/[name].chunk.js",
      assetModuleFilename: "resource/[name].[hash][ext]",
      devtoolModuleFilenameTemplate: isPro
        ? (info) => path.relative(src, info.absoluteResourcePath).replace(/\\/g, "/")
        : (info) => path.resolve(info.absoluteResourcePath).replace(/\\/g, "/"),
    },
    resolve: {
      alias: getAlias(),
      modules: ["node_modules", appNodeModules],
      extensions: [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".pcss",
        ".less",
        ".css",
        ".svg",
        ".html",
        ".json",
        ".d.ts",
      ],
    },
    module: {
      rules: [
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: [
            {
              test: /\.svg$/i,
              issuer: /\.tsx?$/,
              use: [
                "@svgr/webpack",
                {
                  loader: "url-loader",
                  options: {
                    limit: 10000,
                    name: "resource/[name].[hash].[ext]",
                    publicPath: `${publicPath}`,
                  },
                },
              ],
            },
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              type: "asset",
              parser: {
                dataUrlCondition: {
                  maxSize: 10000,
                },
              },
            },
            {
              test: /\.(jsx|js|ts|tsx)$/,
              exclude: paths.appNodeModules,
              loader: require.resolve("babel-loader"),
              options: {
                cacheDirectory: true,
                cacheCompression: false,
                compact: isPro,
              },
            },
            {
              test: /\.(js|mjs)$/,
              include: [
                (filePath) => {
                  function genTranspileDepRegex(transpileDependencies) {
                    const deps = transpileDependencies.map((dep) => {
                      if (typeof dep === "string") {
                        const depPath = path.join("node_modules", dep, "/");
                        return process.platform === "win32"
                            ? depPath.replace(/\\/g, "\\\\") // double escape for windows style path
                            : depPath;
                      } else if (dep instanceof RegExp) {
                        return dep.source;
                      }
                    });
                    return deps.length ? new RegExp(deps.join("|")) : null;
                  }

                  const transpileDepRegex = genTranspileDepRegex([
                    "fast-deep-equal",
                    "nanoid",
                    "copy-text-to-clipboard",
                  ]);
                  return transpileDepRegex.test(filePath);
                },
              ],
              loader: require.resolve("babel-loader"),
              options: {
                sourceType: "unambiguous",
                cacheDirectory: true,
                cacheCompression: false,
                compact: isPro,
              },
            },
            {
              test: /\.css$/,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: shouldUseSourceMap,
                modules: {
                  mode: "icss",
                },
              }),
              sideEffects: true,
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            {
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              //不打包filePath为空的文件
              exclude: [/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
              type: "asset/resource",
            },
          ],
        },
        isPro && {
          test: appIndexJs,
          use: [
            {
              loader: "imports-loader",
              options: {
                imports: [
                  "side-effects core-js/stable",
                  // "side-effects regenerator-runtime/runtime",
                ],
              },
            },
          ],
        },
      ].filter(Boolean),
    },
    plugins: _.concat(
      [
        isDev &&
          new ReactRefreshWebpackPlugin({
            overlay: false,
          }),
        new webpack.DefinePlugin({
          //不要把经常会变化的变量注入process.env，会导致文件chunkhash一直变化
          "process.env": Object.keys(_.omit(webpackEnv, ["RELEASE_VERSION"])).reduce(
            (envProps, key) => {
              envProps[key] = JSON.stringify(webpackEnv[key]);
              return envProps;
            },
            {},
          ),
          __DEV__: true,
          __EXPERIMENTAL__: true,
          __PROFILE__: true
        }),
        new CopyWebpackPlugin({
          patterns: [
            {
              context: appPublic,
              from: "**/*",
            },
          ],
        }),
        isPro &&
          new MiniCssExtractPlugin({
            filename: "css/[name].[contenthash:8].css",
            chunkFilename: "css/[name].[contenthash:8].chunk.css",
            ignoreOrder: true,
          }),
      ],
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      new HtmlWebpackPlugin(
        _.assign(
          {
            inject: true,
            template: appHtml,
            templateParameters: {
              PUBLIC_URL: publicPath.slice(0, -1),
              isPro,
            },
          },
          isPro
            ? {
                minify: {
                  removeComments: true,
                  collapseWhitespace: true,
                  removeRedundantAttributes: true,
                  useShortDoctype: true,
                  removeEmptyAttributes: true,
                  removeStyleLinkTypeAttributes: true,
                  keepClosingSlash: true,
                  minifyJS: true,
                  minifyCSS: true,
                  minifyURLs: true,
                },
              }
            : undefined,
        ),
      ),
      new WebpackBar({
        name: "📦  Webpack",
        reporters: isPro ? ["basic", "profile"] : ["fancy"],
        profile: isPro,
      }),
      isDev && new CaseSensitivePathsPlugin(),
      //new (require("webpack-bundle-analyzer").BundleAnalyzerPlugin)()
    ).filter(Boolean),

    optimization: {
      minimize: isPro,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          minify: TerserPlugin.swcMinify,
          terserOptions: {
            mangle: true,
            compress: {
              // 删除所有的 `console` 语句，可以兼容ie浏览器
              drop_console: isPro,
            },
            format: {
              comments: false,
            },
          },
        }),
        new CssMinimizerPlugin({
          minify: CssMinimizerPlugin.lightningCssMinify,
        }),
      ],
    },
  };
};

module.exports = getWebpackConfig;
