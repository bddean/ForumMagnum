import * as _ from 'underscore';
import { Comments } from '../../lib/collections/comments/collection';
import Conversations from '../../lib/collections/conversations/collection';
import Messages from '../../lib/collections/messages/collection';
import { Posts } from "../../lib/collections/posts/collection";
import { Tags } from "../../lib/collections/tags/collection";
import Users from "../../lib/collections/users/collection";
import { userIsAdmin, userCanDo } from '../../lib/vulcan-users/permissions';
import { userTimeSinceLast } from '../../lib/vulcan-users/helpers';
import { DatabasePublicSetting } from "../../lib/publicSettings";
import { performVoteServer } from '../voteServer';
import { updateMutator, createMutator, deleteMutator, Globals } from '../vulcan-lib';
import { recalculateAFCommentMetadata } from './alignment-forum/alignmentCommentCallbacks';
import { newDocumentMaybeTriggerReview } from './postCallbacks';
import { getCollectionHooks } from '../mutationCallbacks';
import { forumTypeSetting } from '../../lib/instanceSettings';


const MINIMUM_APPROVAL_KARMA = 5

let adminTeamUserData = forumTypeSetting.get() === 'EAForum' ?
  {
    username: "AdminTeam",
    email: "forum@effectivealtruism.org"
  } :
  {
    username: "LessWrong",
    email: "lesswrong@lesswrong.com"
  }

const getLessWrongAccount = async () => {
  let account = await Users.findOne({username: adminTeamUserData.username});
  if (!account) {
    const newAccount = await createMutator({
      collection: Users,
      document: adminTeamUserData,
      validate: false,
    })
    return newAccount.data
  }
  return account;
}

// Return the IDs of all ancestors of the given comment (not including the provided
// comment itself).
const getCommentAncestorIds = async (comment: DbComment): Promise<string[]> => {
  const ancestorIds: string[] = [];
  
  let currentComment: DbComment|null = comment;
  while (currentComment?.parentCommentId) {
    currentComment = await Comments.findOne({_id: currentComment.parentCommentId});
    if (currentComment)
      ancestorIds.push(currentComment._id);
  }
  
  return ancestorIds;
}

// Return all comments in a subtree, given its root.
export const getCommentSubtree = async (rootComment: DbComment, projection: any): Promise<any[]> => {
  const comments: DbComment[] = [rootComment];
  let visited = new Set<string>();
  let unvisited: string[] = [rootComment._id];
  
  while(unvisited.length > 0) {
    const childComments = await Comments.find({parentCommentId: {$in: unvisited}}, projection).fetch();
    for (let commentId of unvisited)
      visited.add(commentId);
    unvisited = [];
    
    for (let childComment of childComments) {
      if (!visited.has(childComment._id)) {
        comments.push(childComment);
        unvisited.push(childComment._id);
      }
    }
  }
  
  return comments;
}
Globals.getCommentSubtree = getCommentSubtree;


getCollectionHooks("Comments").newValidate.add(async function createShortformPost (comment: DbComment, currentUser: DbUser) {
  if (comment.shortform && !comment.postId) {
    if (currentUser.shortformFeedId) {
      return ({
        ...comment,
        postId: currentUser.shortformFeedId
      });
    }
    
    const post = await createMutator({
      collection: Posts,
      document: {
        userId: currentUser._id,
        shortform: true,
        title: `${ currentUser.displayName }'s Shortform`,
        af: currentUser.groups?.includes('alignmentForum'),
      },
      currentUser,
      validate: false,
    })
    await updateMutator({
      collection: Users,
      documentId: currentUser._id,
      set: {
        shortformFeedId: post.data._id
      },
      unset: {},
      validate: false,
    })

    return ({
      ...comment,
      postId: post.data._id
    })
  }
  return comment
});

getCollectionHooks("Comments").newSync.add(async function CommentsNewOperations (comment: DbComment) {
  // update lastCommentedAt field on post or tag
  if (comment.postId) {
    await Posts.rawUpdateOne(comment.postId, {
      $set: {lastCommentedAt: new Date()},
    });
  } else if (comment.tagId) {
    await Tags.rawUpdateOne(comment.tagId, {
      $set: {lastCommentedAt: new Date()},
    });
  }

  return comment;
});

//////////////////////////////////////////////////////
// comments.remove.async                            //
//////////////////////////////////////////////////////

getCollectionHooks("Comments").removeAsync.add(async function CommentsRemovePostCommenters (comment: DbComment, currentUser: DbUser) {
  const { postId } = comment;

  if (postId) {
    const postComments = await Comments.find({postId}, {sort: {postedAt: -1}}).fetch();
    const lastCommentedAt = postComments[0] && postComments[0].postedAt;
  
    // update post with a decremented comment count, and corresponding last commented at date
    await Posts.rawUpdateOne(postId, {
      $set: {lastCommentedAt},
    });
  }
});

getCollectionHooks("Comments").removeAsync.add(async function CommentsRemoveChildrenComments (comment: DbComment, currentUser: DbUser) {

  const childrenComments = await Comments.find({parentCommentId: comment._id}).fetch();

  childrenComments.forEach(childComment => {
    void deleteMutator({
      collection: Comments,
      documentId: childComment._id,
      currentUser: currentUser,
      validate: false
    });
  });
});

//////////////////////////////////////////////////////
// other                                            //
//////////////////////////////////////////////////////

getCollectionHooks("Comments").createBefore.add(function AddReferrerToComment(comment, properties)
{
  if (properties && properties.context && properties.context.headers) {
    let referrer = properties.context.headers["referer"];
    let userAgent = properties.context.headers["user-agent"];
    
    return {
      ...comment,
      referrer: referrer,
      userAgent: userAgent,
    };
  }
});


const commentIntervalSetting = new DatabasePublicSetting<number>('commentInterval', 15) // How long users should wait in between comments (in seconds)
getCollectionHooks("Comments").newValidate.add(async function CommentsNewRateLimit (comment: DbComment, user: DbUser) {
  if (!userIsAdmin(user)) {
    const timeSinceLastComment = await userTimeSinceLast(user, Comments);
    const commentInterval = Math.abs(parseInt(""+commentIntervalSetting.get()));

    // check that user waits more than 15 seconds between comments
    if((timeSinceLastComment < commentInterval)) {
      throw new Error(`Please wait ${commentInterval-timeSinceLastComment} seconds before commenting again.`);
    }
  }
  return comment;
});


//////////////////////////////////////////////////////
// LessWrong callbacks                              //
//////////////////////////////////////////////////////

getCollectionHooks("Comments").editAsync.add(async function CommentsEditSoftDeleteCallback (comment: DbComment, oldComment: DbComment, currentUser: DbUser) {
  if (comment.deleted && !oldComment.deleted) {
    await moderateCommentsPostUpdate(comment, currentUser);
  }
});

export async function moderateCommentsPostUpdate (comment: DbComment, currentUser: DbUser) {
  await recalculateAFCommentMetadata(comment.postId)
  
  if (comment.postId) {
    const comments = await Comments.find({postId:comment.postId, deleted: false}).fetch()
  
    const lastComment:DbComment = _.max(comments, (c) => c.postedAt)
    const lastCommentedAt = (lastComment && lastComment.postedAt) || (await Posts.findOne({_id:comment.postId}))?.postedAt || new Date()
  
    void updateMutator({
      collection:Posts,
      documentId: comment.postId,
      set: {
        lastCommentedAt:new Date(lastCommentedAt),
      },
      unset: {},
      validate: false,
    })
  }
  
  void commentsDeleteSendPMAsync(comment, currentUser);
}

getCollectionHooks("Comments").newValidate.add(function NewCommentsEmptyCheck (comment: DbComment) {
  const { data } = (comment.contents && comment.contents.originalContents) || {}
  if (!data) {
    throw new Error("You cannot submit an empty comment");
  }
  return comment;
});

export async function commentsDeleteSendPMAsync (comment: DbComment, currentUser: DbUser | undefined) {
  if ((!comment.deletedByUserId || comment.deletedByUserId !== comment.userId) && comment.deleted && comment.contents?.html) {
    const onWhat = comment.tagId
      ? (await Tags.findOne(comment.tagId))?.name
      : (comment.postId
        ? (await Posts.findOne(comment.postId))?.title
        : null
      );
    const moderatingUser = comment.deletedByUserId ? await Users.findOne(comment.deletedByUserId) : null;
    const lwAccount = await getLessWrongAccount();

    const conversationData = {
      participantIds: [comment.userId, lwAccount._id],
      title: `Comment deleted on ${onWhat}`
    }
    const conversation = await createMutator({
      collection: Conversations,
      document: conversationData,
      currentUser: lwAccount,
      validate: false
    });

    let firstMessageContents =
        `One of your comments on "${onWhat}" has been removed by ${(moderatingUser?.displayName) || "the Akismet spam integration"}. We've sent you another PM with the content. If this deletion seems wrong to you, please send us a message on Intercom (the icon in the bottom-right of the page); we will not see replies to this conversation.`
    if (comment.deletedReason && moderatingUser) {
      firstMessageContents += ` They gave the following reason: "${comment.deletedReason}".`;
    }

    const firstMessageData = {
      userId: lwAccount._id,
      contents: {
        originalContents: {
          type: "html",
          data: firstMessageContents
        }
      },
      conversationId: conversation.data._id
    }

    const secondMessageData = {
      userId: lwAccount._id,
      contents: comment.contents,
      conversationId: conversation.data._id
    }

    await createMutator({
      collection: Messages,
      document: firstMessageData,
      currentUser: lwAccount,
      validate: false
    })

    await createMutator({
      collection: Messages,
      document: secondMessageData,
      currentUser: lwAccount,
      validate: false
    })

    // eslint-disable-next-line no-console
    console.log("Sent moderation messages for comment", comment)
  }
}

// Duplicate of PostsNewUserApprovedStatus
getCollectionHooks("Comments").newSync.add(async function CommentsNewUserApprovedStatus (comment: DbComment) {
  const commentAuthor = await Users.findOne(comment.userId);
  if (!commentAuthor?.reviewedByUserId && (commentAuthor?.karma || 0) < MINIMUM_APPROVAL_KARMA) {
    return {...comment, authorIsUnreviewed: true}
  }
  return comment;
});

// Make users upvote their own new comments
getCollectionHooks("Comments").newAfter.add(async function LWCommentsNewUpvoteOwnComment(comment: DbComment) {
  var commentAuthor = await Users.findOne(comment.userId);
  const votedComment = commentAuthor && await performVoteServer({ document: comment, voteType: 'smallUpvote', collection: Comments, user: commentAuthor })
  return {...comment, ...votedComment} as DbComment;
});

getCollectionHooks("Comments").newAsync.add(async function NewCommentNeedsReview (comment: DbComment) {
  const user = await Users.findOne({_id:comment.userId})
  const karma = user?.karma || 0
  if (karma < 100) {
    await Comments.rawUpdateOne({_id:comment._id}, {$set: {needsReview: true}});
  }
});

getCollectionHooks("Comments").editSync.add(async function validateDeleteOperations (modifier, comment: DbComment, currentUser: DbUser) {
  if (modifier.$set) {
    const { deleted, deletedPublic, deletedReason } = modifier.$set
    if (deleted || deletedPublic || deletedReason) {
      if (deletedPublic && !deleted) {
        throw new Error("You cannot publicly delete a comment without also deleting it")
      }

      if (deletedPublic && !deletedReason) {
        throw new Error("Publicly deleted comments need to have a deletion reason");
      }

      if (
        (comment.deleted || comment.deletedPublic) &&
        (deletedPublic || deletedReason) &&
        !userCanDo(currentUser, 'comments.remove.all') &&
        comment.deletedByUserId !== currentUser._id) {
          throw new Error("You cannot edit the deleted status of a comment that's been deleted by someone else")
      }

      if (deletedReason && !deleted && !deletedPublic) {
        throw new Error("You cannot set a deleted reason without deleting a comment")
      }

      const childrenComments = await Comments.find({parentCommentId: comment._id}).fetch()
      const filteredChildrenComments = _.filter(childrenComments, (c) => !(c && c.deleted))
      if (
        filteredChildrenComments &&
        (filteredChildrenComments.length > 0) &&
        (deletedPublic || deleted) &&
        !userCanDo(currentUser, 'comment.remove.all')
      ) {
        throw new Error("You cannot delete a comment that has children")
      }
    }
  }
  return modifier
});

getCollectionHooks("Comments").editSync.add(async function moveToAnswers (modifier, comment: DbComment) {
  if (modifier.$set) {
    if (modifier.$set.answer === true) {
      await Comments.rawUpdateMany({topLevelCommentId: comment._id}, {$set:{parentAnswerId:comment._id}}, { multi: true })
    } else if (modifier.$set.answer === false) {
      await Comments.rawUpdateMany({topLevelCommentId: comment._id}, {$unset:{parentAnswerId:true}}, { multi: true })
    }
  }
  return modifier
});

getCollectionHooks("Comments").createBefore.add(async function HandleReplyToAnswer (comment: DbComment, properties)
{
  if (comment.parentCommentId) {
    let parentComment = await Comments.findOne(comment.parentCommentId)
    if (parentComment) {
      let modifiedComment = {...comment};
      
      if (parentComment.answer) {
        modifiedComment.parentAnswerId = parentComment._id;
      }
      if (parentComment.parentAnswerId) {
        modifiedComment.parentAnswerId = parentComment.parentAnswerId;
      }
      if (parentComment.tagId) {
        modifiedComment.tagId = parentComment.tagId;
      }
      if (parentComment.topLevelCommentId) {
        modifiedComment.topLevelCommentId = parentComment.topLevelCommentId;
      }
      
      return modifiedComment;
    }
  }
  return comment;
});

getCollectionHooks("Comments").createBefore.add(async function SetTopLevelCommentId (comment: DbComment, context)
{
  let visited: Partial<Record<string,boolean>> = {};
  let rootComment: DbComment|null = comment;
  while (rootComment?.parentCommentId) {
    // This relies on Meteor fibers (rather than being async/await) because
    // Vulcan callbacks aren't async-safe.
    rootComment = await Comments.findOne({_id: rootComment.parentCommentId});
    if (rootComment && visited[rootComment._id])
      throw new Error("Cyclic parent-comment relations detected!");
    if (rootComment)
      visited[rootComment._id] = true;
  }
  
  if (rootComment && rootComment._id !== comment._id) {
    return {
      ...comment,
      topLevelCommentId: rootComment._id
    };
  }
  return comment;
});

getCollectionHooks("Comments").createAfter.add(async function UpdateDescendentCommentCounts (comment: DbComment) {
  const ancestorIds: string[] = await getCommentAncestorIds(comment);
  
  await Comments.rawUpdateOne({ _id: {$in: ancestorIds} }, {
    $set: {lastSubthreadActivity: new Date()},
    $inc: {descendentCount:1},
  });
  
  return comment;
});

getCollectionHooks("Comments").updateAfter.add(async function UpdateDescendentCommentCounts (comment, context) {
  if (context.oldDocument.deleted !== context.newDocument.deleted) {
    const ancestorIds: string[] = await getCommentAncestorIds(comment);
    const increment = context.oldDocument.deleted ? 1 : -1;
    await Comments.rawUpdateOne({_id: {$in: ancestorIds}}, {$inc: {descendentCount: increment}})
  }
  return comment;
});

getCollectionHooks("Comments").createAfter.add(async (document: DbComment) => {
  await newDocumentMaybeTriggerReview(document);
  return document;
})
