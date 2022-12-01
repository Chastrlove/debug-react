const getHostConfig = () => {
  const NODE_ENV = process.env.NODE_ENV;
  return {
    HOST: "0.0.0.0",
    PORT: 3003,
    publicPath: NODE_ENV === "development" ? "/" : "/",
  };
};

module.exports = getHostConfig;
