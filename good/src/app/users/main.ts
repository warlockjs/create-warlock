import { onceConnected } from "@warlock.js/cascade";
import { Post } from "app/posts/models/post/psot.model";

onceConnected(async () => {
  // TODO: Review cloud storage deleteDirectory not working as expected

  // // Lazy loading
  // const user = (await User.first())!;
  // await user.load("posts");

  // console.log(user.posts!.length);

  // // Eager loading
  // const user2 = await User.with("posts").first();

  // console.log(user2?.posts?.length);

  // const post = await Post.with("author").first();

  // console.log(post?.author);
  const post = await Post.joinWith("author").first();
  console.log(post?.data); // { id, title, authorId, ... } - no author
  console.log(post?.author); // User model instance
});
