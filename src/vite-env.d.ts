/// <reference types="vite/client" />

declare module "*.wav" {
  /** Public URL to the asset after bundling */
  const src: string;
  export default src;
}
