/**
 * Loads images once and keeps them, so switching tile size back and forth doesn't fetch them again.
 */
const cache = new Map();

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement|null>} Null if the image couldn't be loaded.
 */
export function loadImage(url) {
    if (!cache.has(url)) {
        cache.set(url, new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => {
                console.warn(`Could not load image ${url}`);
                resolve(null);
            };
            image.src = url;
        }));
    }
    return cache.get(url);
}

/**
 * @param {Object<string, string>} urlsByKey
 * @returns {Promise<Map<string, HTMLImageElement|null>>}
 */
export async function loadImages(urlsByKey) {
    const entries = Object.entries(urlsByKey);
    const images = await Promise.all(entries.map(([, url]) => loadImage(url)));
    return new Map(entries.map(([key], index) => [key, images[index]]));
}
