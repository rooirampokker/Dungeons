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
    // The tilesets' data is bundled rather than fetched, so the page still works opened straight from disk. That puts
    // the bundle over webpack's default 244 KiB advice; it compresses to well under 100 KiB when served.
    performance: { maxAssetSize: 512 * 1024, maxEntrypointSize: 512 * 1024 },
});
