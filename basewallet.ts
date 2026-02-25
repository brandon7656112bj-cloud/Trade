import { ethers } from "ethers";

class BaseWalletService {
  private address: string = "";
  private privateKey: string = "";

  constructor() {
    console.log("[BaseWallet] Service initialized");
  }

  /**
   * Create a new wallet on Base network
   */
  createNewWallet(): { address: string; privateKey: string } {
    try {
      // Generate a new random wallet
      const newWallet = ethers.Wallet.createRandom();
      this.address = newWallet.address;
      this.privateKey = newWallet.privateKey;

      console.log("[BaseWallet] New wallet created");
      console.log("[BaseWallet] Address:", this.address);

      return {
        address: this.address || "",
        privateKey: this.privateKey || "",
      };
    } catch (error) {
      console.error("[BaseWallet] Error creating wallet:", error);
      throw error;
    }
  }

  /**
   * Get current wallet address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Get wallet details
   */
  getWalletDetails(): { address: string; network: string; status: string } {
    return {
      address: this.address,
      network: "Base Mainnet",
      status: this.address ? "Active" : "Not initialized",
    };
  }

  /**
   * Check wallet balance (mock - would need RPC in production)
   */
  async checkBalance(): Promise<string> {
    if (!this.address) {
      console.log("[BaseWallet] No wallet address set");
      return "0";
    }

    try {
      // In production, this would call Base RPC
      // const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      // const balance = await provider.getBalance(this.address);
      // return ethers.formatEther(balance);

      console.log("[BaseWallet] Balance check for:", this.address);
      return "0"; // Mock balance
    } catch (error) {
      console.error("[BaseWallet] Error checking balance:", error);
      return "0";
    }
  }

  /**
   * Get wallet info for display
   */
  getWalletInfo(): {
    address: string;
    network: string;
    chainId: number;
    explorerUrl: string;
  } {
    return {
      address: this.address,
      network: "Base Mainnet",
      chainId: 8453,
      explorerUrl: `https://basescan.org/address/${this.address}`,
    };
  }

  /**
   * Validate wallet address
   */
  static isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get Base network RPC URL
   */
  static getBaseRpcUrl(): string {
    return "https://mainnet.base.org";
  }

  /**
   * Get Base network chain ID
   */
  static getBaseChainId(): number {
    return 8453;
  }

  /**
   * Get Base network explorer
   */
  static getBaseExplorer(): string {
    return "https://basescan.org";
  }
}

let baseWalletService: BaseWalletService | null = null;

export function initializeBaseWallet(): BaseWalletService {
  baseWalletService = new BaseWalletService();
  return baseWalletService;
}

export function getBaseWallet(): BaseWalletService | null {
  return baseWalletService;
}

export function createNewBaseWallet(): { address: string; privateKey: string } {
  const service = baseWalletService || initializeBaseWallet();
  return service.createNewWallet();
}

export function getBaseWalletAddress(): string {
  const service = baseWalletService;
  if (!service) return "";
  return service.getAddress();
}

export function getBaseWalletDetails(): { address: string; network: string; status: string } {
  const service = baseWalletService;
  if (!service) {
    return { address: "", network: "Base Mainnet", status: "Not initialized" };
  }
  return service.getWalletDetails();
}

export function getBaseWalletInfo(): {
  address: string;
  network: string;
  chainId: number;
  explorerUrl: string;
} {
  const service = baseWalletService;
  if (!service) {
    return {
      address: "",
      network: "Base Mainnet",
      chainId: 8453,
      explorerUrl: "",
    };
  }
  return service.getWalletInfo();
}
