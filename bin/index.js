#!/usr/bin/env node

import Web3 from "web3";
import axios from "axios";
import abi from "./abi.js";
import ora from "ora";
import "dotenv/config.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Args
const argv = yargs(hideBin(process.argv)).argv;

/*--------------
Setup Web3
--------------*/

const dopeContractAddress = `0x8707276df042e89669d69a177d3da7dc78bd8723`;
const paperContractAddress = `0x7aE1D57b58fA6411F32948314BadD83583eE0e8C`;
const dopeCount = 8000;
const basePrice = argv.eth ? argv.eth : 1; // ETH

// Setup the provider.
const web3 = new Web3(
  `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
);

// Get the $PAPER contract interface.
const contract = new web3.eth.Contract(abi, paperContractAddress);

async function init() {
  const spinner = ora(
    `Checking OpenSea for $DOPE under ${basePrice} ETH`
  ).start();

  /*--------------
  Get Dope Assets
  --------------*/

  let allDopeAssets = [];
  let currentOffset = 0;

  function getDopeAssets(offset) {
    return new Promise(async (resolve, reject) => {
      const response = await axios.get(
        `https://api.opensea.io/api/v1/assets?asset_contract_address=${dopeContractAddress}&offset=${offset}&limit=50`
      );
      resolve(response.data.assets);
    });
  }

  // Query the Opensea api for batches of assets. Adjust the for loop to query less or more sets of data.
  for (let i = 0; i < dopeCount / 50; i++) {
    const offset = currentOffset;
    const assets = await getDopeAssets(offset);

    // Append these assets to the assets that we've already queried
    allDopeAssets = [...allDopeAssets, ...assets];
    currentOffset += 50;
  }

  // Get the Dope for sale.
  const dopeAssetsForSale = allDopeAssets
    .filter((asset) => {
      // Filter for just the dope on sale. The taker address is null.
      if (asset.sell_orders) {
        return (
          asset.sell_orders[0].taker.address ===
            "0x0000000000000000000000000000000000000000" &&
          asset.sell_orders[0].current_price < 1000000000000000000 * basePrice
        );
      } else {
        return false;
      }
    })
    // Only return the data we need.
    .map((asset) => {
      return {
        id: asset.token_id,
        price: Web3.utils.fromWei(
          Math.floor(asset.sell_orders[0].current_price).toString()
        ),
      };
    });

  spinner.succeed(
    `Found ${dopeAssetsForSale.length} DOPE under ${basePrice} ETH in OpenSea.`
  );
  spinner.start(`Now checking to see what's been claimed via the contract.`);

  /*--------------
  Check Paper
  --------------*/

  const dopeAssetsWithPaper = [];

  for (let i = 0; i < dopeAssetsForSale.length; i++) {
    const asset = dopeAssetsForSale[i];

    // Check if the asset has claimed its $PAPER (get that money)
    const claimed = await contract.methods
      .claimedByTokenId(asset.id)
      .call({}, function (error, result) {});

    // If not claimed then add it to our list.
    if (!claimed) {
      dopeAssetsWithPaper.push(asset);
    }
  }

  const dopeAssetsWithPaperSorted = dopeAssetsWithPaper.sort(
    (assetA, assetB) => {
      return assetA.price - assetB.price;
    }
  );

  spinner.succeed(
    `Found ${dopeAssetsWithPaper.length} DOPE under ${basePrice} ETH with $PAPER`
  );
  console.table(dopeAssetsWithPaperSorted);
  console.log(`💵 💵 💵 ... get that $PAPER`);
}

init();
