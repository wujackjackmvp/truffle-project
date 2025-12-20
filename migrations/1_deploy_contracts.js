const InfoContract = artifacts.require("InfoContract");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(InfoContract);
};