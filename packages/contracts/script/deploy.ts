// Deploys HiveMarket to whatever chain .env points at (Anvil locally, BOT Chain
// testnet in prod) and writes the address back into .env. viem-based so the whole
// repo stays on one toolchain.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfig, hiveChain, hiveMarketAbi } from "@hive/shared";

const artifact = JSON.parse(
  readFileSync(resolve("out/HiveMarket.sol/HiveMarket.json"), "utf8"),
);
const bytecode = artifact.bytecode.object as `0x${string}`;

const deployerKey = process.env.REQUESTER_PRIVATE_KEY as `0x${string}`;
if (!deployerKey) throw new Error("REQUESTER_PRIVATE_KEY not set");

const account = privateKeyToAccount(deployerKey);
const wallet = createWalletClient({ account, chain: hiveChain, transport: http(chainConfig.rpcUrl) });
const publicClient = createPublicClient({ chain: hiveChain, transport: http(chainConfig.rpcUrl) });

const hash = await wallet.deployContract({ abi: hiveMarketAbi, bytecode });
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress;
if (!address) throw new Error("Deployment failed: no contract address");

console.log(`HiveMarket deployed at ${address}`);
console.log(`Deploy tx: ${hash} (block ${receipt.blockNumber})`);

// Persist address + deploy block into .env for the agents and indexer.
const envPath = resolve("../../.env");
let env = readFileSync(envPath, "utf8");
env = env.replace(/^HIVE_MARKET_ADDRESS=.*$/m, `HIVE_MARKET_ADDRESS=${address}`);
env = env.replace(/^DEPLOY_BLOCK=.*$/m, `DEPLOY_BLOCK=${receipt.blockNumber}`);
writeFileSync(envPath, env);
console.log("Wrote HIVE_MARKET_ADDRESS and DEPLOY_BLOCK to .env");
