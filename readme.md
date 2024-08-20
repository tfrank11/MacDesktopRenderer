## Mac Desktop Renderer

General purpose renderer to display basic images using folders on the Mac desktop.

![](https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2ZnZjJlcXhpY3N1NjdrZWNhY3NpbDI4dnJzMTdia3Mza2F0c3Z1YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TpN7dxLMpGvS8XZdzh/giphy.gif)

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

renderer.renderGrids(images, 750);
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
