/// <reference types="electron-vite/node" />

// electron-vite copies files imported with the `?asset` suffix into the build
// output and returns their resolved path at runtime (used for the tray icon).
declare module '*?asset' {
  const assetPath: string
  export default assetPath
}
