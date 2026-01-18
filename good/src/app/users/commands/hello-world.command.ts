import { command } from "@warlock.js/core";

export default command({
  name: "hello.world",
  action: () => {
    console.log("Hello World Guys!");
  },
});
