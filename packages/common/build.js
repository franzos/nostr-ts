import { build } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { esbuildDecorators } from '@anatine/esbuild-decorators';

const shared = {
    entryPoints: ['./src/index.ts'],
    bundle: true,
    treeShaking: true,
    platform: 'node',
    target: 'node18',
    plugins: [nodeExternalsPlugin()],
}

build({
    ...shared,
    outfile: 'dist/index.cjs',
    format: 'cjs',
    plugins: [
        esbuildDecorators({
            tsconfig: 'tsconfig.build.json',
            cwd: process.cwd(),
          }),
          ...shared.plugins,
        ]
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

build({
    ...shared,
    outfile: 'dist/index.esm.js',
    format: 'esm',
}).catch((err) => {
    console.error(err);
    process.exit(1);
});