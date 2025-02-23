import React from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import classNames from 'classnames';
import { postGetPageUrl } from '../../lib/collections/posts/helpers';
import StarIcon from '@material-ui/icons/Star';
import PersonIcon from '@material-ui/icons/Person';
import DetailsIcon from '@material-ui/icons/Details';
import LinkIcon from '@material-ui/icons/Link';
import { curatedUrl } from '../recommendations/RecommendationsAndCurated';
import { Link } from '../../lib/reactRouterWrapper';
import { forumTypeSetting, taggingNameIsSet, taggingNamePluralSetting } from '../../lib/instanceSettings';

const styles = (theme: ThemeType): JssStyles => ({
  iconSet: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    lineHeight: "1.0rem",
  },
  postIcon: {
    marginRight: 4,
  },
  icon: {
    // note: the specificity seems necessary to successfully override the OmegaIcon styling.
    // not sure if this is best way to do this
    '&&': {
      fontSize: "1.2rem",
      color: theme.palette.icon.dim4,
      position: "relative",
      top: 3,
    }
  },
  question: {
    fontSize: "1.2rem",
    color: theme.palette.icon.dim4,
    fontWeight: '600'
  },
  alignmentIcon: {
    '&&':{
      top: 0,
    }
  },
  linkIcon: {
    fontSize: "1.2rem",
    color: theme.palette.icon.dim4,
    transform: 'rotate(-45deg)',
    position: "relative",
    top: 3
  }
});

export const CuratedIcon = ({classes}:{classes:ClassesType}) => {
  const { LWTooltip } = Components;

  return <span className={classes.postIcon}>
      <LWTooltip title={<div>Curated <div><em>(click to view all curated posts)</em></div></div>} placement="bottom-start">
        <Link to={curatedUrl}><StarIcon className={classes.icon}/></Link>
      </LWTooltip> 
    </span> 
}

const CuratedIconComponent = registerComponent('CuratedIcon', CuratedIcon, {styles});


const PostsItemIcons = ({post, classes, hideCuratedIcon}: {
  post: PostsBase,
  classes: ClassesType,
  hideCuratedIcon?: boolean
}) => {
  const { OmegaIcon, LWTooltip, CuratedIcon } = Components;

  return <span className={classes.iconSet}>
    {post.curatedDate && !hideCuratedIcon && 
      <CuratedIcon/>}
    
    {post.question && <span className={classes.postIcon}>
      <LWTooltip title={<div>Question <div><em>(click to view all questions)</em></div></div>} placement="right">
        <Link to={"/questions"}><span className={classes.question}>Q</span></Link>
      </LWTooltip>
    </span>}

    {post.url && <span className={classes.postIcon}>
      <LWTooltip title={<div>Link Post <div><em>(Click to see linked content)</em></div></div>} placement="right">
        <a href={post.url}><LinkIcon className={classes.linkIcon}/></a>
      </LWTooltip>
    </span>}

    {!post.frontpageDate && !post.isEvent && <span className={classes.postIcon}>
      <LWTooltip title="Personal Blogpost" placement="right">
        <PersonIcon className={classes.icon}/>
      </LWTooltip>
    </span>}

    {post.meta && <span className={classes.postIcon}>
      <LWTooltip title={<div>Meta <div><em>(Click to view all meta content)</em></div></div>} placement="right">
        <Link to={`/${taggingNameIsSet.get() ? taggingNamePluralSetting.get() : 'tag'}/site-meta`}>
          <DetailsIcon className={classes.icon}/>
        </Link>
      </LWTooltip>
    </span>}

    {forumTypeSetting.get() !== 'AlignmentForum' && post.af &&
      <span className={classes.postIcon}>
        <LWTooltip title={<div>Crossposted from AlignmentForum.org<div><em>(Click to visit AF version)</em></div></div>} placement="right">
            <a href={`https://alignmentforum.org${postGetPageUrl(post)}`}><OmegaIcon className={classNames(classes.icon, classes.alignmentIcon)}/></a>
        </LWTooltip>
      </span>
    }
  </span>
}

const PostsItemIconsComponent = registerComponent('PostsItemIcons', PostsItemIcons, {styles});

declare global {
  interface ComponentTypes {
    PostsItemIcons: typeof PostsItemIconsComponent
    CuratedIcon: typeof CuratedIconComponent
  }
}
