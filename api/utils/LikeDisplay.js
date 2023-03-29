module.exports.LikeDisplay= function (post,user) {
  const is_liked = user ? (post.likedUser.includes(user._id) ? 1 : 0) : 0;
  const self_liked = post.likedUser.includes(post.author._id) ? 1 : 0;
  const numLike = post.likedUser.length;
  let likeDisplay = "";
  if (numLike == 0) {
    likeDisplay = "0";
  } else {
    if (is_liked) {
      likeDisplay += "Bạn";
      if (self_liked) {
        if (!(post.author._id).equals(user._id)) {
          likeDisplay = `${likeDisplay}, ${post.author.name}`;
          if (numLike > 2) {
            likeDisplay = `${likeDisplay} và ${numLike - 2} người khác`;
          }
        } else {
          if (numLike > 1)
            likeDisplay = `${likeDisplay} và ${numLike - 1} người khác`;
        }
      }
    } else {
      if (self_liked) {
        likeDisplay += post.author.name;
        if (numLike > 1) {
          likeDisplay = `${likeDisplay} và ${numLike - 1} người khác`;
        }
      } else {
        likeDisplay = numLike.toString();
      }
    }
  }
  return likeDisplay;
};
