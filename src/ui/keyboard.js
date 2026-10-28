import $ from 'jquery';

/**
 * Keyboard → movement direction. Uses physical key positions (event.code), so WASD works on any keyboard layout.
 * @type {Object<string, import('../core/directions.js').Direction>}
 */
export const KEY_DIRECTIONS = {
    KeyW: 'n',
    ArrowUp: 'n',
    KeyD: 'e',
    ArrowRight: 'e',
    KeyS: 's',
    ArrowDown: 's',
    KeyA: 'w',
    ArrowLeft: 'w',
    KeyQ: 'nw',
    KeyE: 'ne',
    KeyZ: 'sw',
    Backquote: 'sw',
    KeyC: 'se',
};

const TYPING_TARGETS = 'input[type=text], input[type=number], select, textarea';

/**
 * Calls `handler` with a direction whenever a movement key is pressed, except while the user is typing in a field.
 * @param {(direction: import('../core/directions.js').Direction) => void} handler
 */
export function onDirectionKey(handler) {
    $(document).on('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || $(event.target).is(TYPING_TARGETS)) return;
        const direction = KEY_DIRECTIONS[event.originalEvent.code];
        if (!direction) return;
        event.preventDefault();
        handler(direction);
    });
}

/**
 * Calls `handler` when a key (an event.code such as 'KeyI') is pressed, except while the user is typing in a field.
 * @param {string} code
 * @param {() => void} handler
 */
export function onKey(code, handler) {
    $(document).on('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.originalEvent.repeat || $(event.target).is(TYPING_TARGETS)) return;
        if (event.originalEvent.code !== code) return;
        event.preventDefault();
        handler();
    });
}
