import "./env";
import { DI } from "./inversify.config";
export { defineConfig } from "./utils";
// export const ready = DI.createApp();
// ready().then((app) => {
//   app.bootstrap();
// });
const ready = DI.createExpress();
ready.then((app) => {
  app.bootstrap();
});
