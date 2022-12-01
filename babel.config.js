const { dirname } = require("path");

module.exports = function (api, opts) {
  if (!opts) {
    opts = {};
  }
  const env = api.env();

  const isEnvDevelopment = env === "development";
  const isEnvProduction = env === "production";
  const isEnvTest = env === "test";

  return {
    assumptions: {
      privateFieldsAsProperties: true,
      setPublicClassFields: true,
    },
    // Babel assumes ES Modules, which isn't safe until CommonJS
    // dies. This changes the behavior to assume CommonJS unless
    // an `import` or `export` is present in the file.
    // https://github.com/webpack/webpack/issues/4039#issuecomment-419284940
    // sourceType: "unambiguous",
    presets: [
      isEnvTest && [
        // ES features necessary for user's Node version
        "@babel/preset-env",
        {
          targets: {
            node: "current",
          },
        },
      ],
      (isEnvDevelopment || isEnvProduction) && [
        "@babel/preset-env",
        {
          useBuiltIns: "entry",
          corejs: 3,
          exclude: ["transform-typeof-symbol"],
        },
      ],
      [
        "@babel/preset-react",
        {
          runtime: "automatic",
          development:isEnvDevelopment
        },
      ],
      ["@babel/preset-typescript"],
    ].filter(Boolean),
    plugins: [
      "@emotion",
      ["@babel/plugin-proposal-decorators", { legacy: true }],
      ["@babel/plugin-proposal-class-properties"],
      [
        "@babel/plugin-proposal-object-rest-spread",
        {
          useBuiltIns: true,
        },
      ],
      [
        "@babel/plugin-transform-runtime",
        {
          //若是不开启corejs选项，在转换时，Babel 使用的一些helper会假设已经存在全局的polyfill；开启之后，Babel 会认为全局的polyfill不存在，并会引入corejs来完成原来需要polyfill才能完成的工作。
          corejs: false, //表示是否把内置的东西(Promise,Set,Map,tec)转换成非全局污染垫片。因为通过 preset-env 已经使用了全局的polyfill，所以不需要重复引入
          helpers: true,
          //设置为false引用的是preset-env编译的全局的regeneratorRuntime，设置为true会将regeneratorRuntime变为不污染全局的_regeneratorRuntime，
          // 1.如果 useBuiltIns: "usage", 配置为true可以把regeneratorRuntime变为不污染全局的_regeneratorRuntime
          // 2.如果 useBuiltIns: "entry", 一般来说需要在入口文件添加污染全局的regenerator-runtime/runtime, 理论上此时是没必要设置为true的,但是cra配置为true
          regenerator: true,
          version: require("@babel/runtime/package.json").version,
          absoluteRuntime: dirname(require.resolve("@babel/runtime/package.json")),
          useESModules: isEnvDevelopment || isEnvProduction, // 用webpack时使用 es modules helpers, 减少 commonJS 语法代码
        },
      ],
      ["@babel/plugin-syntax-dynamic-import"],
      ["@babel/plugin-proposal-optional-chaining"],
      ["@babel/plugin-proposal-nullish-coalescing-operator"],
    ],
    env: {
      development: {
        plugins: ["react-refresh/babel"],
      },
    },
    overrides: [
      {
        exclude: /\.tsx?$/,
        plugins: [require('@babel/plugin-transform-flow-strip-types').default],
      },
    ]
  };
};
