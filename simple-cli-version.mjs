import { connect, KeyPair, keyStores, utils } from 'near-api-js';
import path from 'path';
import { homedir } from 'os';

const CREDENTIALS_DIR = '.near-credentials';
const homedirPath = homedir();
const credentialsPath = path.join(homedirPath, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

const options = {
  accountId: 'node405.toddmorey.testnet',
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
  helperUrl: 'https://helper.testnet.near.org',
  explorerUrl: 'https://explorer.testnet.near.org',
  masterAccount: 'toddmorey.testnet',
  initialBalance: utils.format.parseNearAmount('0.1'),
};

let near = await connect({ ...options, deps: { keyStore } });
console.log(near.connection.signer.keyStore);
let keyPair;
let publicKey;
let keyRootPath;
let keyFilePath;

keyPair = await KeyPair.fromRandom('ed25519');
publicKey = keyPair.getPublicKey();

// Check to see if account already exists
try {
  // This is expected to error because the account shouldn't exist
  const account = await near.account(options.accountId);
  await account.state();
  throw new Error(`Sorry, account '${options.accountId}' already exists.`);
} catch (e) {
  if (!e.message.includes('does not exist while viewing')) {
    throw e;
  }
}
if (keyPair) {
  keyRootPath = credentialsPath;
  keyFilePath = `${keyRootPath}/${options.networkId}/${options.accountId}.json`;
  console.log(`Saving key to '${keyFilePath}'`);
  await near.connection.signer.keyStore.setKey(options.networkId, options.accountId, keyPair);
}

// Create account
try {
  const response = await near.createAccount(options.accountId, publicKey);
  console.log(`Account ${options.accountId} for network "${options.networkId}" was created.`);
} catch (error) {
  if (error.type === 'RetriesExceeded') {
    console.warn('Received a timeout when creating account, please run:');
    console.warn(`near state ${options.accountId}`);
    console.warn('to confirm creation. Keyfile for this account has been saved.');
  } else {
    if (!options.usingLedger) await near.connection.signer.keyStore.removeKey(options.networkId, options.accountId);
    throw error;
  }
}
