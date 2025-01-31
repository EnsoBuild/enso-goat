import { createToolParameters } from "@goat-sdk/core";
import { z } from "zod";

export class EnsoRouteParameters extends createToolParameters(
    z.object({
        tokenIn: z.string(),
        tokenOut: z.string(),
        amountIn: z.string(),
    }),
) {}

export class EnsoCheckApprovalParameters extends createToolParameters(
    z.object({
        token: z.string(),
        amount: z.string(),
        walletAddress: z.string(),
    }),
) {}
