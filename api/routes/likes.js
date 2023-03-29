const router = require('express').Router();
const Post = require('../models/Post');
const verify = require('../utils/verifyToken');
const { getUserIDFromToken } = require("../utils/getUserIDFromToken");
var {responseError, setAndSendResponse} = require('../response/error');
router.post('/like', verify, async (req, res) => {
    var {id,token} = req.query;
    var user = await getUserIDFromToken(token);
    // PARAMETER_IS_NOT_ENOUGH
    if(id !== 0 && !id) {
        console.log("No have parameter id");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }
    // PARAMETER_TYPE_IS_INVALID
    if((id && typeof id !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }
    var post;
    try {
        // console.log("You are liking")
        post = await Post.findById(id);
    } catch (err) {
        console.log(err)
        if(err.kind == "ObjectId") {
            console.log("Sai id");
            return setAndSendResponse(res, responseError.POST_IS_NOT_EXISTED);
        }
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }

    if (!post) {
        console.log("Post is not existed");
        return setAndSendResponse(res, responseError.POST_IS_NOT_EXISTED);
    }
    if(post.likedUser) {
        if(post.likedUser.includes(user._id)) {
            const index = post.likedUser.indexOf(user._id);
            post.likedUser.splice(index, 1);
        } else {
            post.likedUser.push(user._id);
        }
    } else {
        post.likedUser = [user._id];
    }
    try {
        const updatedPost = await post.save();
        res.status(200).send({
            code: "1000",
            message: "OK",
            data: {
                like: updatedPost.likedUser.length.toString()
            }
        });
        // console.log("success like/unlike")
    } catch (err) {
        console.log(err);
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
});

module.exports = router;