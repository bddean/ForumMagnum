import { Components, registerComponent } from 'meteor/vulcan:core';
import { withRouter } from 'react-router';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

const KARMA_COLLAPSE_THRESHOLD = -4;

const styles = theme => ({
  node: {
    // Higher specificity to override child class (variant syntax)
    '&$new': {
      borderLeft: `solid 5px ${theme.palette.secondary.light}`
    },
    '&$newHover': {
      borderLeft: `solid 5px ${theme.palette.secondary.main}`
    },
    '&$deleted': {
      opacity: 0.6
    }
  },
  child: {
    marginLeft: 8,
    marginBottom: 8,
    borderLeft: `solid 1px ${theme.palette.grey[300]}`,
    borderTop: `solid 1px ${theme.palette.grey[300]}`,
    borderBottom: `solid 1px ${theme.palette.grey[300]}`,
  },
  new: {},
  newHover: {},
  deleted: {},
  parentScroll: {
    position: "absolute",
    top:0,
    left:0,
    width:8,
    height:"100%",
    cursor:"pointer",
    '&:hover': {
      backgroundColor: "rgba(0,0,0,.075)"
    }
  }
})

class CommentsNode extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      hover: false,
      collapsed: this.isCollapsed(),
      truncated: this.beginTruncated(),
      truncatedStateSet: false,
      finishedScroll: false,
    };
  }

  isCollapsed = () => {
    const { comment } = this.props
    return (
      comment.deleted ||
      comment.baseScore < KARMA_COLLAPSE_THRESHOLD
    )
  }

  beginTruncated = () => {
    const { nestingLevel, startThreadCollapsed } = this.props
    return startThreadCollapsed && nestingLevel === 1
  }

  componentDidMount() {
    const { router, comment, post } = this.props
    let commentHash = router.location.hash;
    const self = this;
    if (comment && commentHash === ("#" + comment._id) && post) {
      setTimeout(function () { //setTimeout make sure we execute this after the element has properly rendered
        self.scrollIntoView()
      }, 0);
    }
  }

  scrollIntoView = (event) => {
    // TODO: This is a legacy React API; migrate to the new type of refs.
    // https://reactjs.org/docs/refs-and-the-dom.html#legacy-api-string-refs
    //eslint-disable-next-line react/no-string-refs
    if (this.refs && this.refs.comment) {
      //eslint-disable-next-line react/no-string-refs
      this.refs.comment.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
      this.setState({finishedScroll: true});
    }
  }

  toggleCollapse = () => {
    this.setState({collapsed: !this.state.collapsed});
  }

  unTruncate = (event) => {
    event.stopPropagation()
    this.setState({truncated: false, truncatedStateSet: true});
  }

  toggleHover = () => {
    this.setState({hover: !this.state.hover});
  }

  render() {
    const { comment, children, nestingLevel=1, currentUser, highlightDate, editMutation, post, muiTheme, router, postPage, classes, child, showPostTitle, unreadComments, expandAllThreads } = this.props;

    const { hover, collapsed, finishedScroll, truncatedStateSet } = this.state

    const truncated = !expandAllThreads && (this.state.truncated || (this.props.truncated && truncatedStateSet === false))

    const newComment = highlightDate && (new Date(comment.postedAt).getTime() > new Date(highlightDate).getTime())
    const nodeClass = classNames(
      "comments-node",
      classes.node,
      {
        "af":comment.af,
        "comments-node-root" : nestingLevel === 1,
        "comments-node-even" : nestingLevel % 2 === 0,
        "comments-node-odd"  : nestingLevel % 2 != 0,
        "comments-node-linked" : router.location.hash === "#" + comment._id && finishedScroll,
        "comments-node-its-getting-nested-here": nestingLevel > 8,
        "comments-node-so-take-off-all-your-margins": nestingLevel > 12,
        "comments-node-im-getting-so-nested": nestingLevel > 16,
        "comments-node-im-gonna-drop-my-margins": nestingLevel > 20,
        "comments-node-what-are-you-even-arguing-about": nestingLevel > 24,
        "comments-node-are-you-sure-this-is-a-good-idea": nestingLevel > 28,
        "comments-node-seriously-what-the-fuck": nestingLevel > 32,
        "comments-node-are-you-curi-and-lumifer-specifically": nestingLevel > 36,
        "comments-node-cuz-i-guess-that-makes-sense-but-like-really-tho": nestingLevel > 40,
        [classes.child]: child,
        [classes.new]: newComment,
        [classes.newHover]: newComment && hover,
        [classes.deleted]: comment.deleted,
      }
    )
    if (comment && post) {
      return (
        <div className={newComment ? "comment-new" : "comment-old"}>
          <div className={nodeClass}
            onMouseEnter={this.toggleHover}
            onMouseLeave={this.toggleHover}
            onClick={(event) => this.unTruncate(event)}
            id={comment._id}>
            {/*eslint-disable-next-line react/no-string-refs*/}
            <div ref="comment">
              <Components.CommentsItem
                collapsed={collapsed}
                truncated={truncated}
                toggleCollapse={this.toggleCollapse}
                currentUser={currentUser}
                comment={comment}
                key={comment._id}
                editMutation={editMutation}
                scrollIntoView={this.scrollIntoView}
                post={post}
                postPage={postPage}
                nestingLevel={nestingLevel}
                showPostTitle={showPostTitle}
                answerId={answerId}
              />
            </div>
            {!collapsed && <div className="comments-children">
              <div className={classes.parentScroll} onClick={this.scrollIntoView}></div>
              {children && children.map(child =>
                <Components.CommentsNode child
                  currentUser={currentUser}
                  comment={child.item}
                  nestingLevel={nestingLevel+1}
                  truncated={truncated}
                  unreadComments={unreadComments}
                  //eslint-disable-next-line react/no-children-prop
                  children={child.children}
                  key={child.item._id}
                  muiTheme={muiTheme}
                  highlightDate={highlightDate}
                  editMutation={editMutation}
                  post={post}
                  postPage={postPage}
                  answerId={answerId}
                />)}
            </div>}
          </div>
        </div>
        )
    } else {
      return null
    }
  }
}

CommentsNode.propTypes = {
  comment: PropTypes.object.isRequired, // the current comment
  router: PropTypes.object.isRequired
};

registerComponent('CommentsNode', CommentsNode,
  withRouter,
  withStyles(styles, { name: "CommentsNode" })
);
