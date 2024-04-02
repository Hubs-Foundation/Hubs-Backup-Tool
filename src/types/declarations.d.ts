// Required to allow importing images with webpack in typescript
declare module "*.png";
declare module "*.jpg";
declare module "*.svg";
declare const api: typeof import("../api").default;
