var TrustLend = artifacts.require("TrustLend");

module.exports = function (deployer, network, accounts) {
  deployer.then(function () {
    return deployer.deploy(TrustLend).then(function () {
      // Migration complete. Copy the deployed address that Truffle prints
      // below into frontend/config.js as CONTRACT_ADDRESS.
    });
  });
};
