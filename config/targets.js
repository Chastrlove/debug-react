const browserslist = require("browserslist");
const { browserslistToTargets } = require("lightningcss");

const getTargets = () => {
  const cwd = process.cwd();
  const result = browserslist(undefined, {
    path: cwd,
    env: process.env.NODE_ENV || "production",
  });
  return browserslistToTargets(result);
};

module.exports = getTargets;
