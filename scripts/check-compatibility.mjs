import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'zero-svelte-compat-'));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const zeroVersions = process.env.TEST_ZERO ? [process.env.TEST_ZERO] : ['1.8.0', '1.9.0'];
const svelteVersions = process.env.TEST_SVELTE ? [process.env.TEST_SVELTE] : ['5.15.0', '5.57.1'];

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} [env]
 */
function run(command, args, cwd, env = process.env) {
	const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
	if (result.error) throw result.error;
	if (result.status !== 0)
		throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
}

try {
	run('pnpm', ['pack', '--pack-destination', temp], root);
	const tarball = join(temp, `${pkg.name}-${pkg.version}.tgz`);
	/** @type {Record<string, string>} */
	const devDependencies = {};
	for (const name of ['vitest', 'vite', 'jsdom', 'typescript', '@types/node', 'arktype', 'zod']) {
		const installed = JSON.parse(
			await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8')
		);
		devDependencies[name] = installed.version;
	}

	for (const zero of zeroVersions) {
		for (const svelte of svelteVersions) {
			console.log(`\n=== Zero ${zero} / Svelte ${svelte} ===`);
			const cwd = join(temp, `zero-${zero}-svelte-${svelte}`);
			await cp(join(root, 'tests'), join(cwd, 'tests'), { recursive: true });
			await cp(join(root, 'vitest.config.ts'), join(cwd, 'vitest.config.ts'));
			await writeFile(
				join(cwd, 'package.json'),
				JSON.stringify(
					{
						name: 'zero-svelte-consumer-test',
						private: true,
						type: 'module',
						dependencies: {
							'zero-svelte': `file:${tarball}`,
							'@rocicorp/zero': zero,
							svelte
						},
						devDependencies
					},
					null,
					2
				)
			);
			await writeFile(
				join(cwd, 'pnpm-workspace.yaml'),
				`overrides:\n  '@rocicorp/zero': ${JSON.stringify(zero)}\n  svelte: ${JSON.stringify(svelte)}\n`
			);
			// The tests use Zero's in-memory browser client; no native build scripts or
			// Postgres/cache services are needed. Only the packed library is installed.
			run('pnpm', ['install', '--ignore-scripts', '--no-frozen-lockfile'], cwd);
			// Guard against accidentally testing a second, newer Zero/Svelte copy
			// installed under the library rather than the selected consumer versions.
			run(
				'node',
				[
					'--input-type=module',
					'-e',
					`
				import { createRequire } from 'node:module';
				import assert from 'node:assert/strict';
				const consumer = createRequire(process.cwd() + '/package.json');
				const library = createRequire(consumer.resolve('zero-svelte'));
				for (const name of ['@rocicorp/zero', 'svelte']) {
					assert.equal(library.resolve(name), consumer.resolve(name), name + ' must be shared');
				}
			`
				],
				cwd
			);
			run('pnpm', ['exec', 'vitest', 'run'], cwd);
			run('pnpm', ['exec', 'vitest', 'run'], cwd, { ...process.env, NODE_ENV: 'production' });
			run('pnpm', ['exec', 'tsc', '-p', 'tests/tsconfig.json'], cwd);
			run('pnpm', ['exec', 'tsc', '-p', 'tests/explicit/tsconfig.json'], cwd);
		}
	}
} finally {
	await rm(temp, { recursive: true, force: true });
}
