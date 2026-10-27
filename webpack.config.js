import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

// Bundles src/ into public/js/bundle.js. public/ is the whole site: open public/index.html or deploy the folder.
export default (env, argv) => ({
    entry: './src/main.js',
    output: {
        path: path.resolve(root, 'public/js'),
        filename: 'bundle.js',
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
});
