import { EnsoClient, RouteParams } from "@ensofinance/sdk";
import { Tool } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
import { Address, Hash } from "viem";
import { ENSO_SUPPORTED_NETWORKS, MIN_ERC20_ABI } from "./constants";
import { EnsoPluginConstructorParams } from "./enso.plugin";
import { EnsoCheckApprovalParameters, EnsoRouteParameters } from "./parameters";

const ENSO_API_KEY = "1e02632d-6feb-4a75-a157-documentation" as const;

export class EnsoService {
    private _ensoClient: EnsoClient;

    constructor({ apiKey = ENSO_API_KEY }: EnsoPluginConstructorParams) {
        this._ensoClient = new EnsoClient({ apiKey });
    }

    @Tool({
        name: "enso_route",
        description: "Find the best route from token to token and execute it",
    })
    async route(walletClient: EVMWalletClient, { tokenIn, tokenOut, amountIn }: EnsoRouteParameters) {
        const chainId = walletClient.getChain().id;
        const sender = walletClient.getAddress() as Address;
        if (!ENSO_SUPPORTED_NETWORKS.has(chainId)) {
            throw Error(`Chain ${chainId} is not supported`);
        }

        try {
            const params: RouteParams = {
                chainId,
                tokenIn: tokenIn as Address,
                tokenOut: tokenOut as Address,
                amountIn,
                fromAddress: sender,
                receiver: sender,
                spender: sender,
            };
            const routeData = await this._ensoClient.getRouterData(params);
            const tx = await walletClient.sendTransaction({
                to: routeData.tx.to,
                data: routeData.tx.data as Hash,
                value: BigInt(routeData.tx.value),
            });
            return tx.hash;
        } catch (err) {
            throw Error(`Failed to route through Enso: ${err}`);
        }
    }

    @Tool({
        name: "enso_check_approval",
        description:
            "Check if the wallet has enough approval for a token to be spent by Enso Router. The approval must be done before the route transaction",
    })
    async checkApproval(walletClient: EVMWalletClient, { token, amount }: EnsoCheckApprovalParameters) {
        const chainId = walletClient.getChain().id;
        const sender = walletClient.getAddress() as Address;
        if (!ENSO_SUPPORTED_NETWORKS.has(chainId)) {
            throw Error(`Chain ${chainId} is not supported`);
        }

        try {
            const approvalData = await this._ensoClient.getApprovalData({
                fromAddress: sender,
                chainId,
                amount,
                tokenAddress: token as Address,
            });

            const { value } = await walletClient.read({
                address: token,
                abi: MIN_ERC20_ABI,
                functionName: "allowance",
                args: [sender, approvalData.spender],
            });

            if (typeof value === "bigint" || typeof value === "string" || typeof value === "number") {
                const valueBI = BigInt(value);
                if (valueBI > BigInt(amount)) {
                    return "Enough allowance, skipping approval";
                }
            }

            const tx = await walletClient.sendTransaction({
                to: approvalData.tx.to,
                data: approvalData.tx.data as Hash,
            });
            return tx.hash;
        } catch (err) {
            throw Error(`Failed to route through Enso: ${err}`);
        }
    }
}
