## Mac Desktop Renderer

General purpose renderer to display basic images using folders on the Mac desktop.

![](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWplNGVtbXNiOWRiMWljbzBsbDAzYTlkNXBmMHhwa2U5andydDVuMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FjX4jaTmdBLZMLAUkc/giphy.gif)

## Helpful:

- quit by typing `q` into the terminal running your node process
- delete all folders AND quit with `c`

## Usage

Render a series of images using `renderGrids()`.

```javascript
const images = [
  [
    [1, 1, 1],
    [0, 0, 0],
    [0, 0, 0],
  ],
  [
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // etc.
];

await renderer.renderGrids({
  grids: images,
  interval: 1000,
});
```

Render one image with `render()`. Note that this is asyncronous, as it waits for the applescript to run. Plz call with await.

```javascript
const image = [
  [0, 0, 0],
  [1, 1, 1],
  [0, 0, 0],
];

await renderer.render(image);
```

## Run

```
pnpm sendit
```

## Convert GIFs to grids

This will convert any gif to arrays of 0s and 1s. For the color threshold, you generally want something from 100-200.

Disclaimer: this part was made entirely with chatGPT

```
pnpm gif-to-grid <path/to/gif> <width> <height> <color threshold>
```

## TODO

- improve `renderer.getScreenDimensions()`
- make `renderer.cleanup()` work
- figure out this .js file import nonsense
- make some lit games
- become more based
