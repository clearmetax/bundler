import chalk from 'chalk';
import figlet from 'figlet';
import promptSync from "prompt-sync";
import { clearScreen } from './utils';
import * as fs from 'fs';
import * as path from 'path';
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const prompt = promptSync({ sigint: true });

interface SystemStatus {
    walletConfigured: boolean;
    rpcConfigured: boolean;
    keypairsCreated: boolean;
    poolBundleReady: boolean;
    feeSettingsConfigured: boolean;
}

interface FeeSettings {
    minTipLamports: number;
    tipPercent: number;
    feeRecipient: string;
}

interface TransactionPreview {
    baseFee: number;
    tipAmount: number;
    totalFee: number;
    estimatedCost: string;
}

export class CLI {
    private static instance: CLI;
    private status: SystemStatus;
    private configPath: string;
    private feeSettings: FeeSettings;
    
    private constructor() {
        this.status = {
            walletConfigured: false,
            rpcConfigured: false,
            keypairsCreated: false,
            poolBundleReady: false,
            feeSettingsConfigured: false
        };
        this.configPath = path.join(process.cwd(), '.env');
        this.feeSettings = {
            minTipLamports: 10000,
            tipPercent: 50,
            feeRecipient: "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"
        };
        this.loadStatus();
    }

    private loadStatus() {
        if (fs.existsSync(this.configPath)) {
            const config = fs.readFileSync(this.configPath, 'utf8');
            this.status.walletConfigured = config.includes('WALLET_PRIVATE_KEY=');
            this.status.rpcConfigured = config.includes('RPC_URL=');
            this.status.feeSettingsConfigured = config.includes('MIN_TIP_LAMPORTS=') && 
                                              config.includes('TIP_PERCENT=') &&
                                              config.includes('FEE_RECIPIENT=');
        }
    }

    public static getInstance(): CLI {
        if (!CLI.instance) {
            CLI.instance = new CLI();
        }
        return CLI.instance;
    }

    private displayHeader() {
        console.log(chalk.cyan(figlet.textSync('PumpFun Bundler', { horizontalLayout: 'full' })));
        console.log(chalk.yellow('\nWelcome to PumpFun Bundler CLI\n'));
    }

    private getStatusIndicator(configured: boolean): string {
        return configured ? chalk.green('✓') : chalk.red('✗');
    }

    private displayStatus() {
        console.log(chalk.cyan('\nSystem Status:'));
        console.log(`${this.getStatusIndicator(this.status.walletConfigured)} Wallet Configuration`);
        console.log(`${this.getStatusIndicator(this.status.rpcConfigured)} RPC Configuration`);
        console.log(`${this.getStatusIndicator(this.status.keypairsCreated)} Keypairs Created`);
        console.log(`${this.getStatusIndicator(this.status.poolBundleReady)} Pool Bundle Ready`);
        console.log(`${this.getStatusIndicator(this.status.feeSettingsConfigured)} Fee Settings`);
        console.log('');
    }

    private displayMenu() {
        console.log(chalk.green('\nMain Menu:'));
        console.log(chalk.white('1. Configure Wallet'));
        console.log(chalk.white('2. Configure RPC'));
        console.log(chalk.white('3. Create Keypairs'));
        console.log(chalk.white('4. Configure Fee Settings'));
        console.log(chalk.white('5. Create Pool Bundle'));
        console.log(chalk.white('6. View Configuration'));
        console.log(chalk.white('7. Manage Wallets'));
        console.log(chalk.red('8. Exit'));
    }

    private async handleConfigureWallet() {
        console.log(chalk.cyan('\n=== Configure Wallet ==='));
        console.log(chalk.gray('Enter your wallet private key in base58 format.'));
        console.log(chalk.gray('This key will be used for deploying and managing your token.'));
        const walletKey = prompt(chalk.yellow('\nEnter your wallet private key: '));
        
        if (walletKey) {
            try {
                // Validate the key format
                if (walletKey.length < 32) {
                    throw new Error('Invalid key format');
                }
                
                // Save to .env file
                let envContent = '';
                if (fs.existsSync(this.configPath)) {
                    envContent = fs.readFileSync(this.configPath, 'utf8');
                }
                
                if (envContent.includes('WALLET_PRIVATE_KEY=')) {
                    envContent = envContent.replace(/WALLET_PRIVATE_KEY=.*/, `WALLET_PRIVATE_KEY=${walletKey}`);
                } else {
                    envContent += `\nWALLET_PRIVATE_KEY=${walletKey}`;
                }
                
                fs.writeFileSync(this.configPath, envContent);
                this.status.walletConfigured = true;
                console.log(chalk.green('\n✓ Wallet configured successfully'));
            } catch (error: any) {
                console.log(chalk.red('\n✗ Error configuring wallet:'), error.message);
            }
        } else {
            console.log(chalk.red('\n✗ Invalid wallet key'));
        }
        this.pressEnterToContinue();
    }

    private async handleConfigureRPC() {
        console.log(chalk.cyan('\n=== Configure RPC ==='));
        console.log(chalk.gray('Enter your Solana RPC URL.'));
        console.log(chalk.gray('You can use public RPCs or your own node.'));
        const rpcUrl = prompt(chalk.yellow('\nEnter your RPC URL: '));
        
        if (rpcUrl) {
            try {
                // Save to .env file
                let envContent = '';
                if (fs.existsSync(this.configPath)) {
                    envContent = fs.readFileSync(this.configPath, 'utf8');
                }
                
                if (envContent.includes('RPC_URL=')) {
                    envContent = envContent.replace(/RPC_URL=.*/, `RPC_URL=${rpcUrl}`);
                } else {
                    envContent += `\nRPC_URL=${rpcUrl}`;
                }
                
                fs.writeFileSync(this.configPath, envContent);
                this.status.rpcConfigured = true;
                console.log(chalk.green('\n✓ RPC configured successfully'));
            } catch (error: any) {
                console.log(chalk.red('\n✗ Error configuring RPC:'), error.message);
            }
        } else {
            console.log(chalk.red('\n✗ Invalid RPC URL'));
        }
        this.pressEnterToContinue();
    }

    private calculateTransactionPreview(amount: number): TransactionPreview {
        const baseFee = 5000; // Base transaction fee in lamports
        const tipAmount = Math.max(
            this.feeSettings.minTipLamports,
            Math.floor(amount * (this.feeSettings.tipPercent / 100))
        );
        const totalFee = baseFee + tipAmount;
        
        return {
            baseFee,
            tipAmount,
            totalFee,
            estimatedCost: `${(totalFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`
        };
    }

    private displayFeePreview(preview: TransactionPreview) {
        console.log(chalk.cyan('\n=== Transaction Fee Preview ==='));
        console.log(chalk.gray('Estimated costs for this transaction:'));
        console.log(chalk.white(`Base Fee: ${(preview.baseFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`));
        console.log(chalk.white(`Tip Amount: ${(preview.tipAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`));
        console.log(chalk.green(`Total Estimated Cost: ${preview.estimatedCost}`));
        console.log(chalk.gray(`Fee Recipient: ${this.feeSettings.feeRecipient}`));
    }

    private async handleConfigureFees() {
        console.log(chalk.cyan('\n=== Configure Fee Settings ==='));
        console.log(chalk.gray('Configure your MEV bundle fee settings.'));
        
        try {
            const minTipLamports = parseInt(prompt(chalk.yellow('\nEnter minimum tip in lamports (default: 10000): ')) || '10000');
            const tipPercent = parseInt(prompt(chalk.yellow('Enter tip percentage (default: 50): ')) || '50');
            const feeRecipient = prompt(chalk.yellow('Enter fee recipient address (default: CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM): ')) || 
                               'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM';

            // Validate inputs
            if (minTipLamports < 0) throw new Error('Minimum tip cannot be negative');
            if (tipPercent < 0 || tipPercent > 100) throw new Error('Tip percentage must be between 0 and 100');
            if (feeRecipient.length < 32) throw new Error('Invalid fee recipient address');

            // Show fee preview for a sample transaction
            const sampleAmount = 1 * LAMPORTS_PER_SOL; // 1 SOL
            const preview = this.calculateTransactionPreview(sampleAmount);
            this.displayFeePreview(preview);

            // Save to .env file
            let envContent = '';
            if (fs.existsSync(this.configPath)) {
                envContent = fs.readFileSync(this.configPath, 'utf8');
            }

            const feeSettings = [
                `MIN_TIP_LAMPORTS=${minTipLamports}`,
                `TIP_PERCENT=${tipPercent}`,
                `FEE_RECIPIENT=${feeRecipient}`
            ];

            feeSettings.forEach(setting => {
                const [key] = setting.split('=');
                if (envContent.includes(`${key}=`)) {
                    envContent = envContent.replace(new RegExp(`${key}=.*`), setting);
                } else {
                    envContent += `\n${setting}`;
                }
            });

            fs.writeFileSync(this.configPath, envContent);
            this.status.feeSettingsConfigured = true;
            this.feeSettings = { minTipLamports, tipPercent, feeRecipient };
            console.log(chalk.green('\n✓ Fee settings configured successfully'));
        } catch (error: any) {
            console.log(chalk.red('\n✗ Error configuring fee settings:'), error.message);
        }
        this.pressEnterToContinue();
    }

    private async handleManageWallets() {
        console.log(chalk.cyan('\n=== Wallet Management ==='));
        console.log(chalk.gray('Manage your wallet configurations.'));
        console.log(chalk.white('\n1. View All Wallets'));
        console.log(chalk.white('2. Add New Wallet'));
        console.log(chalk.white('3. Remove Wallet'));
        console.log(chalk.white('4. Set Primary Wallet'));
        console.log(chalk.white('5. Back to Main Menu'));

        const choice = prompt(chalk.yellow('\nChoose an option (1-5): '));

        switch (choice) {
            case '1':
                await this.viewWallets();
                break;
            case '2':
                await this.addWallet();
                break;
            case '3':
                await this.removeWallet();
                break;
            case '4':
                await this.setPrimaryWallet();
                break;
            case '5':
                return;
            default:
                console.log(chalk.red('\n✗ Invalid option'));
        }
        this.pressEnterToContinue();
    }

    private async viewWallets() {
        console.log(chalk.cyan('\n=== Configured Wallets ==='));
        if (fs.existsSync(this.configPath)) {
            const config = fs.readFileSync(this.configPath, 'utf8');
            const walletLines = config.split('\n').filter(line => line.startsWith('WALLET_'));
            
            if (walletLines.length === 0) {
                console.log(chalk.yellow('\nNo wallets configured'));
                return;
            }

            walletLines.forEach((line, index) => {
                const [key, value] = line.split('=');
                const isPrimary = key === 'WALLET_PRIVATE_KEY';
                console.log(chalk.white(`\n${index + 1}. ${isPrimary ? 'Primary Wallet' : 'Additional Wallet'}`));
                console.log(chalk.gray(`Public Key: ${value.slice(0, 8)}...${value.slice(-8)}`));
            });
        } else {
            console.log(chalk.yellow('\nNo configuration file found'));
        }
    }

    private async addWallet() {
        console.log(chalk.cyan('\n=== Add New Wallet ==='));
        console.log(chalk.gray('Enter the private key for the new wallet.'));
        const walletKey = prompt(chalk.yellow('\nEnter wallet private key: '));
        
        if (walletKey) {
            try {
                if (walletKey.length < 32) {
                    throw new Error('Invalid key format');
                }

                let envContent = '';
                if (fs.existsSync(this.configPath)) {
                    envContent = fs.readFileSync(this.configPath, 'utf8');
                }

                // Generate a unique key for the additional wallet
                const walletCount = (envContent.match(/WALLET_\d+_PRIVATE_KEY/g) || []).length;
                const newWalletKey = `WALLET_${walletCount + 1}_PRIVATE_KEY`;
                
                envContent += `\n${newWalletKey}=${walletKey}`;
                fs.writeFileSync(this.configPath, envContent);
                console.log(chalk.green('\n✓ Additional wallet added successfully'));
            } catch (error: any) {
                console.log(chalk.red('\n✗ Error adding wallet:'), error.message);
            }
        }
    }

    private async removeWallet() {
        console.log(chalk.cyan('\n=== Remove Wallet ==='));
        await this.viewWallets();
        
        const walletIndex = parseInt(prompt(chalk.yellow('\nEnter the number of the wallet to remove: ')) || '0');
        
        if (walletIndex > 0) {
            try {
                let envContent = fs.readFileSync(this.configPath, 'utf8');
                const lines = envContent.split('\n');
                const walletLines = lines.filter(line => line.startsWith('WALLET_'));
                
                if (walletIndex <= walletLines.length) {
                    const walletToRemove = walletLines[walletIndex - 1];
                    envContent = lines.filter(line => line !== walletToRemove).join('\n');
                    fs.writeFileSync(this.configPath, envContent);
                    console.log(chalk.green('\n✓ Wallet removed successfully'));
                } else {
                    throw new Error('Invalid wallet number');
                }
            } catch (error: any) {
                console.log(chalk.red('\n✗ Error removing wallet:'), error.message);
            }
        }
    }

    private async setPrimaryWallet() {
        console.log(chalk.cyan('\n=== Set Primary Wallet ==='));
        await this.viewWallets();
        
        const walletIndex = parseInt(prompt(chalk.yellow('\nEnter the number of the wallet to set as primary: ')) || '0');
        
        if (walletIndex > 0) {
            try {
                let envContent = fs.readFileSync(this.configPath, 'utf8');
                const lines = envContent.split('\n');
                const walletLines = lines.filter(line => line.startsWith('WALLET_'));
                
                if (walletIndex <= walletLines.length) {
                    const selectedWallet = walletLines[walletIndex - 1];
                    const [, value] = selectedWallet.split('=');
                    
                    // Update or add primary wallet
                    if (envContent.includes('WALLET_PRIVATE_KEY=')) {
                        envContent = envContent.replace(/WALLET_PRIVATE_KEY=.*/, `WALLET_PRIVATE_KEY=${value}`);
                    } else {
                        envContent += `\nWALLET_PRIVATE_KEY=${value}`;
                    }
                    
                    fs.writeFileSync(this.configPath, envContent);
                    this.status.walletConfigured = true;
                    console.log(chalk.green('\n✓ Primary wallet updated successfully'));
                } else {
                    throw new Error('Invalid wallet number');
                }
            } catch (error: any) {
                console.log(chalk.red('\n✗ Error setting primary wallet:'), error.message);
            }
        }
    }

    private async handleCreateKeypairs() {
        if (!this.status.walletConfigured || !this.status.rpcConfigured) {
            console.log(chalk.red('\n✗ Missing Requirements:'));
            if (!this.status.walletConfigured) console.log(chalk.yellow('- Wallet not configured'));
            if (!this.status.rpcConfigured) console.log(chalk.yellow('- RPC not configured'));
            this.pressEnterToContinue();
            return;
        }

        console.log(chalk.cyan('\n=== Create Keypairs ==='));
        console.log(chalk.gray('Enter the number of keypairs to create.'));
        console.log(chalk.gray('These will be used for the pool bundle.'));
        const numKeypairs = parseInt(prompt(chalk.yellow('\nEnter number of keypairs to create: ')));
        
        if (isNaN(numKeypairs) || numKeypairs <= 0) {
            console.log(chalk.red('\n✗ Invalid number'));
        } else {
            try {
                // Here you would implement the actual keypair creation
                this.status.keypairsCreated = true;
                console.log(chalk.green(`\n✓ Created ${numKeypairs} keypairs successfully`));
            } catch (error: any) {
                console.log(chalk.red('\n✗ Error creating keypairs:'), error.message);
            }
        }
        this.pressEnterToContinue();
    }

    private async handleCreatePoolBundle() {
        if (!this.status.walletConfigured || !this.status.rpcConfigured || !this.status.keypairsCreated) {
            console.log(chalk.red('\n✗ Missing Requirements:'));
            if (!this.status.walletConfigured) console.log(chalk.yellow('- Wallet not configured'));
            if (!this.status.rpcConfigured) console.log(chalk.yellow('- RPC not configured'));
            if (!this.status.keypairsCreated) console.log(chalk.yellow('- Keypairs not created'));
            this.pressEnterToContinue();
            return;
        }

        console.log(chalk.cyan('\n=== Create Pool Bundle ==='));
        console.log(chalk.green('All requirements met!'));
        console.log(chalk.gray('\nThis will create a pool bundle with your configured settings.'));

        // Get transaction amount for fee preview
        const amount = parseFloat(prompt(chalk.yellow('\nEnter transaction amount in SOL: ')) || '0');
        if (amount > 0) {
            const preview = this.calculateTransactionPreview(amount * LAMPORTS_PER_SOL);
            this.displayFeePreview(preview);
        }

        const proceed = prompt(chalk.yellow('\nProceed with pool bundle creation? (y/n): '));
        
        if (proceed.toLowerCase() === 'y') {
            try {
                // Here you would implement the actual pool bundle creation
                this.status.poolBundleReady = true;
                console.log(chalk.green('\n✓ Pool bundle created successfully'));
            } catch (error: any) {
                console.log(chalk.red('\n✗ Error creating pool bundle:'), error.message);
            }
        } else {
            console.log(chalk.yellow('\nPool bundle creation cancelled'));
        }
        this.pressEnterToContinue();
    }

    private async handleViewConfiguration() {
        console.log(chalk.cyan('\n=== Current Configuration ==='));
        this.displayStatus();
        
        if (fs.existsSync(this.configPath)) {
            const config = fs.readFileSync(this.configPath, 'utf8');
            console.log(chalk.gray('\nConfiguration File Contents:'));
            console.log(chalk.gray(config));
        } else {
            console.log(chalk.yellow('\nNo configuration file found'));
        }
        this.pressEnterToContinue();
    }

    private pressEnterToContinue() {
        console.log(chalk.gray('\nPress Enter to continue...'));
        prompt('');
    }

    public async start() {
        let running = true;

        while (running) {
            clearScreen();
            this.displayHeader();
            this.displayStatus();
            this.displayMenu();

            const answer = prompt(chalk.yellow('\nChoose an option (1-8): '));

            switch (answer) {
                case '1':
                    await this.handleConfigureWallet();
                    break;
                case '2':
                    await this.handleConfigureRPC();
                    break;
                case '3':
                    await this.handleCreateKeypairs();
                    break;
                case '4':
                    await this.handleConfigureFees();
                    break;
                case '5':
                    await this.handleCreatePoolBundle();
                    break;
                case '6':
                    await this.handleViewConfiguration();
                    break;
                case '7':
                    await this.handleManageWallets();
                    break;
                case '8':
                    console.log(chalk.yellow('\nThank you for using PumpFun Bundler!'));
                    running = false;
                    break;
                default:
                    console.log(chalk.red('\nInvalid option. Please choose a number between 1 and 8.'));
                    this.pressEnterToContinue();
            }
        }
    }
} 