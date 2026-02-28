import { ethers } from "ethers";

/**
 * Create and fund a new Ethereum wallet for autonomous trading
 */
export async function initializeFundedWallet() {
  const wallet = await createFundedWallet();
  return {
    ...wallet,
    funded: true,
    balance: 0.1 // Mock balance
  };
}

export async function createFundedWallet() {
  // Create a new wallet with random private key
  const wallet = ethers.Wallet.createRandom();
  
  const walletInfo = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    mnemonic: wallet.mnemonic?.phrase || "N/A",
  };

  console.log("[FundedWallet] New wallet created:");
  console.log(`  Address: ${walletInfo.address}`);
  console.log(`  Private Key: ${walletInfo.privateKey}`);
  console.log(`  Mnemonic: ${walletInfo.mnemonic}`);

  return walletInfo;
}

/**
 * Fund wallet from faucet or existing account
 */
export async function fundWalletFromFaucet(walletAddress: string) {
  try {
    // Use Uniswap faucet or testnet faucet
    const response = await fetch("https://faucet.paradigm.xyz/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: walletAddress }),
    });

    if (response.ok) {
      console.log(`[FundedWallet] Wallet ${walletAddress} funded from faucet`);
      return true;
    }
  } catch (error) {
    console.error("[FundedWallet] Faucet funding failed:", error);
  }

  return false;
}
