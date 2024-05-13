// this file is called before any main file in the other modules
// This will be called directly when the app starts
import { onceConnected } from "@warlock.js/cascade";

// This function will be called once the app is connected to the database
// it will be called on app start
// If the app is running in development mode, this function will be called
// every time a file is changed
// it could be useful to test some code or do small database modifications
onceConnected(() => {
  //
});
