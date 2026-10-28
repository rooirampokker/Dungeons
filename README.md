Dungeons
========

A browser-based random dungeon generator and explorer.

Pick a size and a tile set, and the generator builds a dungeon. Corridors join up, large chambers appear where
there's room, and a hero you steer with the keyboard explores it. Each dungeon has a seed, so a seed you like can be
shared or regenerated.

There are five tile sets:

* **Dundjinni classic**: about 110 hand-drawn tiles at 90 × 90 and 140 × 140. These images are not mine. They were
  made by Probono, Bogie and the other talented people at the [Dundjinni forums](http://www.dundjinni.com/).
* **Gormenghast**: 67 tiles at 140 × 140, inspired by the crumbling castle of Mervyn Peake's novels: flagstone
  passages, vaulted bends and fountains, chequered great halls, Swelter's kitchen and the refectory, the library,
  Sourdust's study, Doctor Prunesquallor's dispensary, the Tower of Flints, the Hall of Bright Carvings, and the
  Countess's birds and white cats.
* **Starbase**: 59 tiles at 140 × 140 in the style of the space stations of the Star Wars films. There are bulkhead
  corridors with lit trim, blast doors, viewports and catwalks over shafts, and a docking bay, hangars and a command
  deck. Rooms include detention cells, a medbay with a healing tank, a reactor, comms, a cantina, a trash compactor,
  a droid bay and a meditation chamber. It has its own hooded hero. It's a fan tribute, with no logos or characters,
  and isn't affiliated with Lucasfilm.
* **Fairy Wood**: 59 tiles at 140 × 140, a maze of winding paths through an enchanted forest. Paths wander under
  the treetops, bend in smooth curves and cross brooks on footbridges and stepping stones, and the great rooms are
  sunlit clearings ringed by young trees. Glades hold fairy rings, toadstool houses, a lily pond, a woodcutter's
  cottage, standing stones, a campsite, a crystal grotto, giant mushrooms, a spring and brambles. It has its own
  hero: a cloaked wanderer with a fairy for company.
* **Manor House**: 160 tiles at 140 × 140 that lay a dungeon out like the floor plan of an inn or a great house:
  anything from a coaching inn to the Addams family's mansion or a wing of Hogwarts. The map is packed with large
  rooms. Some share a wall and open straight into each other; the rest are one hallway apart. The hallways are a whole
  tile wide, with a long runner and thin walls. Each room is one kind, with its own floor and furniture: a taproom
  with a bar, settles and casks; a kitchen with a range and a chopping block; bedchambers; a marble great hall with
  banquet tables and suits of armour; a library lined with bookcases; and a parquet ballroom with a grand piano.
  Small rooms open off the hallways: guest rooms, a study, a bathroom, a privy, a pantry, a chapel, and stairs up and
  down. Walled courtyards and light wells fill the gaps no door reaches.

Gormenghast, Starbase, Fairy Wood and Manor House are drawn in code (see [below](#drawn-tile-sets)), so every tile's
walk map matches its picture exactly.

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

| Command                     | What it does                                                    |
|-----------------------------|-----------------------------------------------------------------|
| `npm run build`             | Bundles `src/` into `public/js/bundle.js`, minified.            |
| `npm run watch`             | Rebuilds on every change, with source maps, while you work.     |
| `npm test`                  | Runs the tests with Node's built-in test runner.                |
| `npm run tiles:gormenghast` | Redraws the Gormenghast tile images and their tileset data.     |
| `npm run tiles:starbase`    | Redraws the Starbase tile images, its hero and its tileset data. |
| `npm run tiles:fairywood`   | Redraws the Fairy Wood tile images, its hero and its tileset data. |
| `npm run tiles:manor`       | Redraws the Manor House tile images and their tileset data.     |

The only tools are webpack for bundling and jQuery for the page. Tests use `node:test`, which comes with Node.

### Playing

Move with **WASD** or the **arrow keys**; **Q**, **E**, **Z** and **C** move diagonally. Leave **Seed** empty for a
random dungeon, or type any word or number to get the same dungeon every time. **Tiles** switches tile set and
builds a new dungeon with it.

**Fog of war** comes in two layers, and both use the same circle around the hero:

* The lower layer dims everything outside the hero's sight, so what they can see from where they stand is clear.
* The upper layer starts black over the whole map and lifts for good wherever the hero has seen.

So the map shows three things:

* what the hero can see now;
* where they've been, dimmed;
* what they haven't found yet, black.

**Sight** sets the circle's radius, from 1 to 4 tiles; the default is 2. Untick **Fog of war** to see the whole map.
Sight isn't blocked by walls yet (see [Extending it](#extending-it)).

The **Hero** tab on the right-hand edge of the map, or the **I** key, slides out the hero's sidebar. On narrow
screens it slides over the map; otherwise the map shrinks to make room. The sidebar shows:

* health and mana as red and blue bars, with the numbers underneath;
* a paper doll, with a slot for each thing the hero can wear: head, neck, body, hands, feet, two rings, a main hand
  and an off hand;
* the hero's stats (strength, dexterity, intelligence, speed and armour), and what their worn items add;
* the inventory.

Drag an item from the inventory onto a slot that takes it to wear it; every place it could go lights up while you
drag. Drag it back to take it off. Double-clicking also puts things on and takes them off. The hero keeps everything
when a new dungeon is generated. The sidebar is a framework for now: the stats don't affect play yet, and the starting
kit in `src/data/character.json` is there to try things out. The browser remembers whether the sidebar was open.

**Debug grid** shows what still needs work:

* red: tiles without a walk map yet, which the hero can't enter;
* dark: tiles that can't be reached from the start;
* orange outline: tiles that don't fit their neighbours (this shouldn't happen);
* green dots: every cell the hero can stand on.

In a development build (`npm run watch`), `window.game` holds the current world, renderer, tileset, character and
sidebar for poking around in the browser console.

How it's organised
------------------

```
public/                 The site: index.html, css/, images/ and the built js/bundle.js
src/
  main.js               Wires the page's controls to generation, the world and the renderer
  core/                 Directions and mirroring, and the seeded random number generator
  tileset/              Loads and checks tileset data, and indexes tiles for fast lookup
  generation/           Builds a Dungeon: start tile, rooms, corridors, overlays, reachability
  world/                Game state: the walk grid, entities (the hero), movement and the fog of war
  character/            The hero as a character: stats, health and mana, equipment slots, items and the inventory
  render/               Canvas renderer: drawing layers, animation, image loading
  ui/                   jQuery code for the settings form, the keyboard and the hero sidebar
  data/                 Tilesets, sprites, items and the hero's starting character as JSON
scripts/tilesets/       Code that draws the Gormenghast, Starbase, Fairy Wood and Manor House tile sets (Node only, no dependencies)
test/                   Tests for everything that doesn't need a browser
```

`core/`, `tileset/`, `generation/`, `world/` and `character/` don't touch the page, so they run and are tested in Node.
Only `render/`, `ui/` and `main.js` use the browser.

Each module starts with a comment saying what it's for, and its data shapes are documented as JSDoc `@typedef`s,
which PhpStorm understands.

### How a dungeon is generated

1. The start tile goes somewhere on the top row.
2. Large chambers are stamped onto the map from the tileset's room templates. Each piece's doors are chosen at
   random from the pieces available. Usually a few rooms are scattered over the map. A tileset can instead have them
   **packed**: the map is filled with rooms in reading order, one hallway apart or now and then sharing a wall.
3. Corridors fill the remaining cells row by row. Each tile must open towards every neighbour that opens towards it
   and be closed towards every neighbour that doesn't, including the map edge and room walls. Tiles can be mirrored
   to fit, so one drawing covers up to four exit layouts.
4. If the tileset asks to **connect** its maps, closed sides between parts that can be reached and parts that can't
   are opened until every room can be reached. Each opening swaps the two tiles for variants with that side open: a
   corridor with one more exit, or a room's wall piece for its door piece.
5. Overlays (chests, cats, banners, cobwebs...) decorate the tiles: one per spot on tiles that mark spots, or at
   most one fixed overlay on tiles that don't. Overlays that block the way close the walk cells under them.
6. If less than half the map can be reached from the start, the layout is thrown away and another is tried.

Everything random goes through one seeded generator, so the same seed and settings always produce the same dungeon.

### Movement

Each tile is split into a 6 × 6 grid of walk cells. A tile's `walk` map lists, for each cell, the directions you can
move from it. When the dungeon is built, every tile's walk map is mirrored to match how the tile is drawn and copied
into one `WalkGrid` for the whole dungeon. A move is allowed when the current cell permits it and the target cell can
be stood on.

### Fog of war

`world/fog.js` keeps the fog at the same walk-cell resolution: for each cell, how clearly the hero has seen it, from
0 (never) to 255. The hero looks around from where they spawn and after every move. That marks every cell within
the sight radius, fading out over the last two cells so the fog's edges can be drawn soft. Nothing is ever unmarked.

The renderer draws the fog as the top two layers in `render/layers.js`:

* `drawSight` lays a dark radial gradient over the screen, clear around the hero and dim from the sight radius out.
* `drawShroud` draws the visible part of the fog's map one pixel per walk cell, black where nothing has been seen,
  and scales it up smoothly over the map.

Both use the fog's own radius and fade, so the sight circle and the edge of what has been uncovered always line up.

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
* **Tags** are free-form. The generator gives meaning to one: `deadend`, for corridor tiles whose openings don't all
  connect inside the tile. Overlays can be limited to tiles with certain tags through `onTags`.
* **Mirroring.** Corridor tiles may be drawn mirrored. Set `"fixedOrientation": true` on a tile whose art mustn't be
  flipped.
* **Weight.** The generator picks among the tiles that fit with equal chance, unless a tile has a `weight` (default
  1). Dead-end rooms in a set with lots of them need a low weight, or the map breaks into small pockets.
* **Sprites.** `"sprites": { "hero": "images/sprites/spacer.png" }` replaces the game's default sprites while the
  tileset is in use. Starbase uses this for its hooded hero.
* **Themes.** A room template can list `themes`, the kinds of room it can be, e.g.
  `{ "id": "hall", "width": 4, "height": 3, "themes": ["taproom", "great-hall"] }`. Each room gets whichever of its
  template's themes the fewest rooms have so far. It's built only from room pieces with that `theme`, so a kitchen's
  floor and furniture stay together. Templates without themes use pieces without one.
* **Generation.** `generation` holds the generator options that suit the tileset. They're the same options
  `generateDungeon()` takes, and options passed to it win. Manor House uses
  `{ "connect": true, "rooms": { "packed": true, "margin": 0, "spacing": 1, "adjoin": 0.3, "minDoors": 1 } }`:
  * rooms packed against the map edge, one tile apart;
  * a 30% chance that a room shares a wall with the room before it instead;
  * every room has at least one door;
  * every room can be reached.

### Overlays

Overlays come in two kinds.

**Fixed overlays** (Dundjinni uses these) have an `offset` and sit at that spot on any tile whose tags match
`onTags`, drawn unmirrored. A tile gets at most one.

**Spot overlays** (Gormenghast uses these) go on spots, which tiles list in `spots`. Each spot is a rectangle on the
tile, with a `kind` such as `floor`, `corner`, `wall-h` or `wall-v`. Each overlay lists the kinds it suits and its
footprint `size`, so the generator only puts things where they fit. One tile can hold several.

```jsonc
"spots": [
  { "kind": "floor", "rect": [38, 42, 64, 48], "chance": 0.5 },                  // [x, y, width, height]
  { "kind": "corner", "rect": [23, 23, 20, 20], "facing": "nw", "canBlock": true },
  { "kind": "wall-h", "rect": [47, 16, 46, 15], "facing": "n" }
],
"overlays": [
  { "id": "crates", "image": "overlay-crates.png", "spots": ["floor", "corner"], "size": [20, 18], "blocks": true }
]
```

* **Facing.** A spot against a wall or in a corner says which one with `facing`. Overlays are drawn as if against
  the north wall (horizontal walls), the west wall (vertical walls) or in the north-west corner. The game mirrors
  them to suit the spot and keeps them against its wall or corner. Mirroring the tile moves and mirrors its
  decorations too.
* **Blocking.** An overlay with `blocks` stops the hero, so it only goes on spots marked `canBlock`. The
  drawn tile sets' build checks that blocking such a spot can never cut a tile in two.
* **Images** are centred on the footprint and can be larger than it, so a candle's glow can spill around it.
* **Chance.** Each spot rolls its own `chance` (default `overlayChance`), and a tile avoids repeating an overlay while
  others fit.
* **Weight and limits.** An overlay with a `weight` is picked more or less often than the others that fit (default
  1). One with `perRoom` appears at most that many times in a single large room, so a hall gets one fireplace. An
  overlay and its turned copy share a `group` and count together.

The tileset is checked when the page loads and when the tests run. Errors stop it loading; warnings, such as tiles
without walk maps or moves that only work one way, are printed to the browser console.

Drawn tile sets
---------------

Gormenghast, Starbase, Fairy Wood and Manor House are drawn in code, using only Node. Their shared tools are in
`scripts/tilesets/lib/`:

* `raster.js` is a small software rasteriser: shapes, noise, soft shadows, glows and supersampled smoothing.
* `png.js` writes the images.
* `layout.js` holds the geometry every drawn set shares. That's tile and walk-cell sizes, corridor and room outlines,
  the overlay spot helpers, and `roomPiece()` for building great halls and hangars.
* `builder.js` turns a tileset's catalogue into images and JSON, works out and checks the walk maps, and writes the
  preview images.
* `transpose.js` turns a tile across its diagonal. A passage running north-south becomes one running east-west, and
  a room with its door to the south gets its door to the east, so one drawing covers both.

Each set has its own folder: `scripts/tilesets/gormenghast/`, `starbase/`, `fairywood/` or `manor/`.

* `style.js` holds the palette and paints the parts every tile shares:
  * Gormenghast: castle masonry, stone walls and flagstones.
  * Starbase: hull machinery, bulkheads with strip lights, deck plates and the hangar floor.
  * Fairy Wood: canopy and treetops, a ragged edge of ferns, earth paths and meadow grass.
  * Manor House: thin walls along the tile edges, and a floor for each kind of room. That's oak boards, flagstones,
    marble, a fitted carpet, parquet, glazed tiles, and limestone with a runner. Board and tile patterns repeat every
    tile, so a room's floor looks laid in one piece.
* `decor.js` holds the furnishings:
  * Gormenghast: pillars, hearths, bookshelves, carvings and candles.
  * Starbase: consoles, holo-tables, a reactor core, crates, droids, a shuttle and force fields.
  * Fairy Wood: toadstools, fairy rings, logs, boulders, brooks, bridges, ponds, lanterns and a cottage.
  * Manor House: tables, chairs, beds, barrels, bookcases, fireplaces, stairs, rugs, plants and a black cat.
* `tiles.js` lists every tile, with its floor outline, what to put on it, and its overlay spots. Fairy Wood's
  `tiles.js` also has its own path shapes: winding paths, curved bends, round junctions and glades. Manor House's
  builds a full set of room pieces for each kind of room, with a door on every outer wall a piece can have one.
  Every opening is the middle four walk cells of a side, with a stub of wall either side as a door post.
* `overlays.js` holds the decorations for the generator to scatter: 44 each for Gormenghast and Fairy Wood, 37 for
  Starbase and 49 for Manor House. Wall overlays are drawn once, and the build makes the turned copy for east and
  west walls. Starbase's and Fairy Wood's `overlays.js` also draw their hero sprites.
* `build.js` calls `buildTileset()` with all of the above.

A tile's walk map is worked out from its floor outline and from anything its decorations block, so it can't disagree
with the picture. The build stops with an error in any of these cases:

* a tile can't be left through one of its exits;
* part of a room can't be reached;
* blocking a `canBlock` spot would cut a tile in two;
* no overlay fits a spot.

Lighting comes from no particular side, so mirrored tiles still look right.

To change the art or add a tile, edit a set's files and run its `npm run tiles:...` script. Then commit the images and
JSON it writes; the scripts produce identical files every time. Two options help when reviewing:

```bash
npm run tiles:starbase -- --sheet tiles.png --dungeon dungeon.png
```

`--sheet` saves every tile and overlay side by side in one image. `--dungeon` generates a dungeon from the new tiles,
decorations included, and saves it as one image. The `SEED`, `COLS` and `ROWS` environment variables choose which
dungeon (by default seed "preview" at 12 × 8).

Extending it
------------

* **More chamber shapes.** Add a template to `rooms`, e.g. `{ "id": "long-hall", "width": 4, "height": 3 }`. Slots are
  worked out from position (corners, edges, centre), so any size works with the existing pieces. Add `slots` to the
  template to control each cell yourself. `generateDungeon(tileset, { rooms: { max, templates } })` controls how many
  are placed and which templates are used. Give the template `themes`, and draw a set of pieces for each, to keep a
  room's furnishings together.
* **Another tile set.** Add a JSON file next to the others, with its images in `public/images/tiles/<id>/`. To draw
  one in code, copy `scripts/tilesets/starbase/` as a starting point and give it a `tiles:<id>` script. Then import
  the JSON in `main.js`, add it to `TILESET_DATA`, and add its id to `SHIPPED` in `test/support.js` so the tests check
  it too. Nothing else is tied to particular art.
* **Line of sight.** The fog of war is a plain circle, so the hero sees through walls into the next room. To stop
  that, make `Fog.look()` cast rays from the hero and stop each ray at a wall. A walk map records movement, not
  sight, so the walls will need marking in the tile data. The drawn tile sets can work them out from their floor
  outlines, as they do the walk maps.
* **Hidden creatures.** `world.fog.isVisible(x, y)` says whether the hero can see a cell now, so the renderer can
  skip creatures out of sight.
* **Creatures.** The world already keeps a list of `entities`; the hero is just the first. Creatures can use
  `moveEntity` and the same `WalkGrid` for pathfinding. Their sprites go in `src/data/sprites.json`, and the renderer
  animates any entity.
* **Combat and other rules.** Keep them in plain modules alongside `world/`, with no page code, so they can be tested
  like the rest. Use the seeded random number generator for dice rolls so results stay reproducible.
* **Items.** Add them to `src/data/items.json`:

  ```jsonc
  { "id": "oak-staff", "name": "Oak staff", "type": "weapon", "icon": "staff", "colour": "#b07a45",
    "bonuses": { "intelligence": 2, "mana": 15 }, "description": "..." }
  ```

  * `type` decides which slots take it.
  * `bonuses` can raise any stat, or the maximum of a pool, while the item is worn.
  * Without an `image`, it's shown as one of the icons in `ui/glyphs.js`, tinted with its `colour`.
  * A type no slot takes, like `potion`, can only be carried.
* **Slots and stats.** Slots are listed in `character/items.js`, with the item types each takes. Each also needs a
  place on the paper doll, a grid area of the same name in `.doll` in `style.css`. Stats and pools are listed in
  `character/stats.js`, and the sidebar shows whatever is there.
* **Using the stats.** `statTotals(character)` gives every stat with its bonuses. The character is created once in
  `main.js` and outlives each dungeon, so combat, speed or carrying limits can read it from there, and drinking a
  potion can change `character.pools`. Call `sidebar.render()` after changing the character outside the sidebar.
  All moves of items go through `moveItem()` in `character/character.js`, so rules such as two-handed weapons belong
  there.
