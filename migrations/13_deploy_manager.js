module.exports = function(deployer, network, accounts) {
    contractAddresses = [];
    // local
    contractAddresses['ConditionalTokens']        = '0x5b1869D9A4C187F2EAa108f3062412ecf0526b24';
    contractAddresses['FPMMDeterministicFactory'] = '0xCfEB869F69431e42cdB54A4F4f105C19C080A601';
    contractAddresses['USDC']                     = '0xD833215cBcc3f914bD1C9ece3EE7BF8B14f841bb';
    // mumbai
    // contractAddresses['ConditionalTokens']        = '0x90650Ad42479d4646CE34680F546FEfB1223d497';
    // contractAddresses['FPMMDeterministicFactory'] = '0xDDCF25c28691d87E3a47BEF0d81528364a145675';    
    // contractAddresses['USDC']                     = '0xcAC7af235F9281f1e9687D3e0e18B5620f5bEd11';

    deployer.deploy(artifacts.require('ConditionalTokensManager'),
        accounts[0],
        contractAddresses['FPMMDeterministicFactory'],
        contractAddresses['ConditionalTokens'],
        contractAddresses['USDC']
    );
  };
  