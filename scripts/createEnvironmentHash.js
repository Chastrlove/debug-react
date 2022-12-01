const { createHash } = require("crypto");

const createEnvHash = (env) => {
  const hash = createHash("md5");
  hash.update(JSON.stringify(env));
  return hash.digest("hex");
};

module.exports = createEnvHash;
