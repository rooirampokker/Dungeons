Dungeons
========

A browser-based random dungeon generator and explorer.

Pick a size and the generator builds a dungeon from about 110 hand-drawn tiles. Corridors join up, large chambers
appear where there's room, and a hero you steer with the keyboard explores it. Each dungeon has a seed, so a seed you
like can be shared or regenerated.

The images are not mine. They were made by Probono, Bogie and the other talented people at the
[Dundjinni forums](http://www.dundjinni.com/).

View a demo at https://dungeons.albrecht.uk.com/

Running it
----------

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
npm run build
```

Then open `public/index.html` in a browser, or serve the `public/` folder from any web server. `public/` is the
complete site, so that's the folder to deploy.

| Command         | What it does                                                    |
|-----------------|-----------------------------------------------------------------|
| `npm run build` | Bundles `src/` into `public/js/bundle.js`, minified.            |
| `npm run watch` | Rebuilds on every change, with source maps, while you work.     |
| `npm test`      | Runs the tests with Node's built-in test runner.                |

The only tools are webpack for bundling and jQuery for the page. Tests use `node:test`, which comes with Node.

### Playing

Move with **WASD** or the **arrow keys**; **Q**, **E**, **Z** and **C** move diagonally. Leave **Seed** empty for a
random dungeon, or type any word or number to get the same dungeon every time.

**Debug grid** shows what still needs work:

* red: tiles without a walk map yet, which the hero can't enter;
* dark: tiles that can't be reached from the start;
* orange outline: tiles that don't fit their neighbours (this shouldn't happen);
* green dots: every cell the hero can stand on.

In a development build (`npm run watch`), `window.game` holds the current world, renderer and tileset for poking
around in the browser console.

How it's organised
------------------

```
public/                 The site: index.html, css/, images/ and the built js/bundle.js
src/
  main.js               Wires the page's controls to generation, the world and the renderer
  core/                 Directions and mirroring, and the seeded random number generator
  tileset/              Loads and checks tileset data, and indexes tiles for fast lookup
  generation/           Builds a Dungeon: start tile, rooms, corridors, overlays, reachability
  world/                Game state: the walk grid, entities (the hero) and movement
  render/               Canvas renderer: drawing layers, animation, image loading
  ui/                   jQuery code for the settings form and the keyboard
  data/                 Tilesets and sprites as JSON
test/                   Tests for everything that doesn't need a browser
```

`core/`, `tileset/`, `generation/` and `world/` don't touch the page, so they run and are tested in Node. Only
`render/`, `ui/` and `main.js` use the browser.

Each module starts with a comment saying what it's for, and its data shapes are documented as JSDoc `@typedef`s,
which PhpStorm understands.

### How a dungeon is generated

1. The start tile goes somewhere on the top row.
2. Large chambers are stamped onto the map from the tileset's room templates. Each piece's doors are chosen at
   random from the pieces available.
3. Corridors fill the remaining cells row by row. Each tile must open towards every neighbour that opens towards it
   and be closed towards every neighbour that doesn't, including the map edge and room walls. Tiles can be mirrored
   to fit, so one drawing covers up to four exit layouts.
4. Overlays (chests, statues, traps) decorate tiles tagged `empty`.
5. If less than half the map can be reached from the start, the layout is thrown away and another is tried.

Everything random goes through one seeded generator, so the same seed and settings always produce the same dungeon.

### Movement

Each tile is split into a 6 × 6 grid of walk cells. A tile's `walk` map lists, for each cell, the directions you can
move from it. When the dungeon is built, every tile's walk map is mirrored to match how the tile is drawn and copied
into one `WalkGrid` for the whole dungeon. A move is allowed when the current cell permits it and the target cell can
be stood on.

Tileset data
------------

A tileset is a JSON file in `src/data/tilesets/`. Images live in `public/`, one folder per tile size.

```jsonc
{
  "id": "dundjinni",
  "referenceSize": 140,                 // overlay offsets are measured at this tile size
  "subGrid": 6,                         // walk cells per tile side
  "resolutions": { "90": "images/tiles/dundjinni/90/", "140": "images/tiles/dundjinni/140/" },
  "overlayChance": 0.9,
  "rooms": [{ "id": "great-hall", "width": 3, "height": 3 }],
  "tiles": [{
    "id": "bottom,right,passage",
    "image": "bottom,right,passage.png",
    "role": "corridor",                 // corridor | room | start | filler
    "exits": ["e", "s"],                // as drawn, before mirroring
    "tags": ["passage"],
    "walk": { "2,2": ["e", "s"], "2,3": ["e", "w"] }   // "row,col": directions you can move from that cell
  }],
  "overlays": [{ "id": "overlay,passage", "image": "overlay,passage.png", "offset": [26, 48],
                 "onTags": ["empty"], "onExits": ["e", "w"] }]
}
```

* **Roles.** `corridor` tiles fill the map. `room` tiles are pieces of large chambers and need a `roomSlot`: `nw`,
  `n`, `ne`, `w`, `c`, `e`, `sw`, `s` or `se`. A room piece's `exits` include its open sides inside the room as well
  as its doors. `start` tiles can have a `spawn` cell for the hero. `filler` is solid rock, used only where a cell can
  have no exits at all.
* **Tags** are free-form. The generator gives meaning to two: `deadend`, for corridor tiles whose openings don't all
  connect inside the tile, and `empty`, for tiles that can take an overlay.
* **Mirroring.** Corridor tiles may be drawn mirrored. Set `"fixedOrientation": true` on a tile whose art mustn't be
  flipped.

The tileset is checked when the page loads and when the tests run. Errors stop it loading; warnings, such as tiles
without walk maps or moves that only work one way, are printed to the browser console.

Extending it
------------

* **More chamber shapes.** Add a template to `rooms`, e.g. `{ "id": "long-hall", "width": 4, "height": 3 }`. Slots are
  worked out from position (corners, edges, centre), so any size works with the existing pieces. Add `slots` to the
  template to control each cell yourself. `generateDungeon(tileset, { rooms: { max, templates } })` controls how many
  are placed and which templates are used.
* **A different tile set.** Add a JSON file next to `dundjinni.json` with its images in `public/images/tiles/<id>/`,
  and import it in `main.js`. Nothing else is tied to the current art.
* **Fog of war.** Add drawing layers in `render/renderer.js` (`DEFAULT_LAYERS`), one for unexplored tiles and one for
  explored tiles out of sight. Track what has been seen in the world, computed from the `WalkGrid`. A walk map
  records movement, not sight, so line of sight will need walls marked in the tile data.
* **Creatures.** The world already keeps a list of `entities`; the hero is just the first. Creatures can use
  `moveEntity` and the same `WalkGrid` for pathfinding. Their sprites go in `src/data/sprites.json`, and the renderer
  animates any entity.
* **Combat and other rules.** Keep them in plain modules alongside `world/`, with no page code, so they can be tested
  like the rest. Use the seeded random number generator for dice rolls so results stay reproducible.
