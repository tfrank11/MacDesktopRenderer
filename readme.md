## Mac Desktop Renderer

General purpose renderer to display basic images using folders on the Mac desktop.

![](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWplNGVtbXNiOWRiMWljbzBsbDAzYTlkNXBmMHhwa2U5andydDVuMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FjX4jaTmdBLZMLAUkc/giphy.gif)

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

renderer.renderGrids(images);
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

## TODO

- make `renderer.cleanup()` work
- figure out this .js file import nonsense
- make some lit games
- become more based
