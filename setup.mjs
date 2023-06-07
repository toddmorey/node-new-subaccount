import { connect, KeyPair, keyStores, utils } from 'near-api-js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import fs from 'fs';
import open from 'open';
import { spawn } from 'child_process';

// Equivalent of __dirname in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

const HELP = `Please run this script in the following format:

    node create-testnet-account.js CREATOR_ACCOUNT.testnet NEW_ACCOUNT.testnet AMOUNT
`;

const CREDENTIALS_DIR = '.near-credentials';
const homedirPath = homedir();
const credentialsPath = path.join(homedirPath, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

if (process.argv.length !== 5) {
  console.info(HELP);
  process.exit(1);
}

const masterAccount = process.argv[2];
const subAccount = process.argv[3];
const initialDeposit = process.argv[4] || '50'; // in NEAR tokens

const config = {
  keyStore,
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
  helperUrl: 'https://helper.testnet.near.org',
  explorerUrl: 'https://explorer.testnet.near.org',
  masterAccount: 'toddmorey.testnet',
};

const newSubAccountCrendentials = await createSubAccount(masterAccount, subAccount, initialDeposit);
await exportCredentials(newSubAccountCrendentials);
// await registerNode(masterAccount, subAccount, newSubAccountCrendentials.public_key);
await displayDockerInstructions({
  node: subAccount,
  port: '6363',
  path: '/mnt/sdb1',
  device: '/dev/device',
});

async function createSubAccount(creatorAccountId, newAccountId, initialDeposit) {
  const initialBalance = utils.format.parseNearAmount(initialDeposit);
  const near = await connect({ ...config, initialBalance, keyStore });

  const keyPair = KeyPair.fromRandom('ed25519');
  const publicKey = keyPair.getPublicKey().toString();
  const secretKey = keyPair.toString();

  console.log(`Creating sub account ${newAccountId}... `);
  console.log('--------------');
  console.log('creator: ', creatorAccountId);
  console.log('initial deposit: ', initialDeposit);
  console.log('public key: ', publicKey);
  console.log('--------------');

  if (keyPair) {
    // store keypair to local machine's UnencryptedFileSystemKeyStore
    console.log('saving credentials to the local keystore... ');
    await keyStore.setKey(config.networkId, newAccountId, keyPair);
  }

  // Create account
  try {
    console.log(`Asking Near to create ${newAccountId}...`);
    const response = await near.createAccount(newAccountId, publicKey);
    console.log(`Account ${newAccountId} was created.`);
  } catch (error) {
    if (error.type === 'RetriesExceeded') {
      console.warn('Received a timeout when creating account, please run:');
      console.warn(`near state ${newAccountId}`);
      console.warn('to confirm creation. Keyfile for this account has been saved.');
    } else {
      await near.connection.signer.keyStore.removeKey(config.networkId, newAccountId);
      throw error;
    }
    process.exit(1);
  }

  const credentials = {
    account_id: newAccountId,
    public_key: publicKey,
    private_key: secretKey,
  };

  return credentials;
}

async function exportCredentials(credentials) {
  console.log('exporting credentials to ./onmachina.json config file... ');
  const filePath = './onmachania.json';
  const jsonData = JSON.stringify(credentials);
  fs.writeFile(filePath, jsonData, 'utf8', (err) => {
    if (err) {
      console.error('An error occurred while writing the file:', err);
    }
  });
}

async function registerNode(creatorAccountId, subAccountID, publicKey) {
  const near = await connect({ ...config, keyStore });
  const creatorAccount = await near.account(creatorAccountId);

  try {
    const result = await creatorAccount.functionCall({
      contractId: 'dev-1684076402429-48753957150583', // TODO: replace temporary contractId with the final contractId
      methodName: 'node_deposit', // The name of the function to call
      args: { node_id: subAccountID, public_key: publicKey }, // The arguments to pass to the function
      gas: '300000000000000', // The maximum amount of gas to use for the function call
      attachedDeposit: nearAPI.utils.format.parseNearAmount('25'), // Optional: attach some NEAR tokens to the call
    });
  } catch (error) {
    console.error('There was an error registering the node with OnMachina. ', error);
    process.exit(1);
  }
}

async function displayDockerInstructions(params) {
  const searchParams = new URLSearchParams(params);

  // Start the server
  const server = spawn('http-server', ['./instructions', '-s'], { stdio: 'inherit' });
  // Open the URL in the default browser
  open('http://localhost:8080/?' + searchParams).then(() => {
    console.log('Displaying instructions in the browser...');
  });

  // stop the server when the script is done
  process.on('exit', () => {
    server.kill();
  });
}
