import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  type Address,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfig, hiveChain, hiveMarketAbi, marketAddress } from "@hive/shared";

export function publicClient(): PublicClient {
  return createPublicClient({ chain: hiveChain, transport: http(chainConfig.rpcUrl) });
}

/// Binds the HiveMarket contract to a funded key. One binding per agent.
export function market(privateKey: `0x${string}`) {
  if (!marketAddress) throw new Error("HIVE_MARKET_ADDRESS not set — deploy first");
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ account, chain: hiveChain, transport: http(chainConfig.rpcUrl) });
  const client = publicClient();
  return {
    account,
    address: marketAddress,
    read: getContract({ address: marketAddress, abi: hiveMarketAbi, client }).read,
    write: getContract({ address: marketAddress, abi: hiveMarketAbi, client: wallet }).write,
    client,
  };
}

/// Poll new events in [from, to] for the given event name. Polling (not websockets)
/// is the safe default on testnets where subscriptions are often flaky.
export async function pollEvents(
  client: PublicClient,
  address: Address,
  eventName: string,
  fromBlock: bigint,
  toBlock: bigint,
) {
  return client.getContractEvents({
    address,
    abi: hiveMarketAbi,
    eventName: eventName as never,
    fromBlock,
    toBlock,
  });
}
