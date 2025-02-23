import { Components, registerComponent } from '../../lib/vulcan-lib';
import { postGetPageUrl } from '../../lib/collections/posts/helpers';
import React, {useState, useCallback} from 'react';
import { Link } from '../../lib/reactRouterWrapper';
import { useSingle } from '../../lib/crud/withSingle';

const styles = (theme: ThemeType): JssStyles => ({
  highlightContinue: {
    marginTop:theme.spacing.unit*2
  }
})

const PostsHighlight = ({post, maxLengthWords, forceSeeMore=false, classes}: {
  post: PostsList,
  maxLengthWords: number,
  forceSeeMore?: boolean,
  classes: ClassesType,
}) => {
  const { htmlHighlight = "", wordCount = 0 } = post.contents || {}
  const [expanded, setExpanded] = useState(false);
  const {document: expandedDocument, loading} = useSingle({
    skip: !expanded && !!post.contents,
    documentId: post._id,
    collectionName: "Posts",
    fetchPolicy: "cache-first",
    fragmentName: "PostsExpandedHighlight",
  });
  
  const clickExpand = useCallback((ev) => {
    setExpanded(true);
    ev.preventDefault();
  }, []);
  
  return <Components.ContentStyles contentType="postHighlight">
    <Components.LinkPostMessage post={post} />
    <Components.ContentItemTruncated
      maxLengthWords={maxLengthWords}
      graceWords={20}
      rawWordCount={wordCount}
      expanded={expanded}
      getTruncatedSuffix={({wordsLeft}: {wordsLeft:number}) => <div className={classes.highlightContinue}>
        {(forceSeeMore || wordsLeft < 1000)
          ? <Link to={postGetPageUrl(post)} onClick={clickExpand}>
              (See More – {wordsLeft} more words)
            </Link>
          : <Link to={postGetPageUrl(post)}>
              (Continue Reading – {wordsLeft} more words)
            </Link>
        }
      </div>}
      dangerouslySetInnerHTML={{__html: expandedDocument?.contents?.html || htmlHighlight}}
      description={`post ${post._id}`}
    />
    {loading && expanded && <Components.Loading/>}
  </Components.ContentStyles>
};

const PostsHighlightComponent = registerComponent('PostsHighlight', PostsHighlight, {styles});

declare global {
  interface ComponentTypes {
    PostsHighlight: typeof PostsHighlightComponent
  }
}
