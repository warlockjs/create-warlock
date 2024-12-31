// this file is called before any main file in the other modules
// This will be called directly when the app starts
import { onceConnected } from "@warlock.js/cascade";
import { Post } from "./posts/models";
import { User } from "./users/models/user";

// This function will be called once the app is connected to the database
// it will be called on app start
// If the app is running in development mode, this function will be called
// every time a file is changed
// it could be useful to test some code or do small database modifications
onceConnected(async () => {
  const user = await User.findOrCreate(
    {
      email: "hassanzohdy@gmail.com",
    },
    {
      name: "Hasan Zohdy",
      email: "hassanzohdy@gmail.com",
      password: "123456",
    },
  );

  await Post.create({
    author: user,
    title: "My first post",
    content: "This is my first post",
  });

  await Post.create({
    author: user,
    title: "My second post",
    content: "This is my second post",
  });

  await Post.create({
    author: user,
    title: "My third post",
    content: "This is my third post",
  });

  console.log("Done");
});
