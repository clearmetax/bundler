import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";
import * as fs from 'fs';
import * as path from 'path';

// Load configuration from .env file if it exists
let walletKey = "";
let payerKey = "";
let rpcUrl = "";

const configPath = path.join(__dirname, '.env');
if (fs.existsSync(configPath)) {
  try {
    const envConfig = fs.readFileSync(configPath, 'utf8')
      .split('\n')
      .reduce((acc: any, line) => {
        const [key, value] = line.split('=').map(str => str.trim());
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});

    walletKey = envConfig.WALLET_PRIVATE_KEY || "";
    payerKey = envConfig.PAYER_PRIVATE_KEY || "";
    rpcUrl = envConfig.RPC_URL || "";
  } catch (error) {
    console.warn("Error reading .env file:", error);
  }
}

// PRIV KEY OF DEPLOYER
export const wallet = walletKey ? 
  Keypair.fromSecretKey(bs58.decode(walletKey)) :
  Keypair.generate(); // Generate a new keypair if none provided

// PRIV KEY OF FEEPAYER
export const payer = payerKey ?
  Keypair.fromSecretKey(bs58.decode(payerKey)) :
  Keypair.generate(); // Generate a new keypair if none provided

// ENTER YOUR RPC
export const rpc = rpcUrl || "https://api.mainnet-beta.solana.com"; 

/* DONT TOUCH ANYTHING BELOW THIS */

export const connection = new Connection(rpc, "confirmed");

export const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

export const RayLiqPoolv4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

export const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");

export const mintAuthority = new PublicKey("TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM");

export const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const eventAuthority = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");

export const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");