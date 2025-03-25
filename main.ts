import { CLI } from './src/cli';

async function main() {
	try {
		const cli = CLI.getInstance();
		await cli.start();
	} catch (error) {
		console.error('Fatal error:', error);
		process.exit(1);
	}
}

main();
