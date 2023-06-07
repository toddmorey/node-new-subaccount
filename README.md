# Script to Create and register an OnMachina Node

This is a node-based script you can run on your local machine to create and register a NEAR subaccount as part of the setup process for a new OnMachina storage node.

(Each storage node on the OnMachina network needs a NEAR subaccount created and registered with OnMachina.)

## What the script does

1. Creates a new NEAR subaccount to be used for your OnMachina node.
2. Saves the subaccount credentials keypair in your `~/.near-credentials` directory
3. Exports the subaccount config to `./onmachina.json` (to be used by the Docker instance)
4. Displays instructions for launching the docker instance in your browser.

## Prerequisites

- You will need a master NEAR account. The NEAR accounts used by OnMachina nodes can only be sub accounts of a master account.
- You'll need to be logged in to your NEAR master account. If you aren't logged in, run `near login` first.
- You'll need a balance of at least 50 NEAR to seed the new subaccount.

## Installation

```
git clone https://github.com/toddmorey/node-new-subaccount.git
cd ./node-new-subaccount
npm install
```

## Running the command

```shell
node ./setup.mjs {MASTER_ACCOUNT.testnet} {NEW_SUBACCOUNT.testnet}
```

Tip: You can also provide a final param as the amount of the initial deposit (expressed in NEAR). The default is 50 Near.
