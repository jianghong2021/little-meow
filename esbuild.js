const esbuild = require("esbuild");
const {solidPlugin} = require('esbuild-plugin-solid');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const cont = process.argv.includes('--cont');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function buildContent() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/cat/chat-cont.tsx'
		],
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'browser',
		outfile: 'assets/js/chat-cont.js',
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
			solidPlugin({
				dev: !production
			})
		],
	});
	await ctx.rebuild();
	await ctx.dispose();
}

async function buildPanelContent() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/cat/agent-cont.tsx'
		],
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'browser',
		outfile: 'assets/js/agent-cont.js',
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
			solidPlugin({
				dev: !production
			})
		],
	});
	await ctx.rebuild();
	await ctx.dispose();
}

if (cont) {
	buildContent();
	buildPanelContent();
}

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
