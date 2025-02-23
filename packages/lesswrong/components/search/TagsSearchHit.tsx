import React from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { tagGetUrl } from '../../lib/collections/tags/helpers';
import { Link } from '../../lib/reactRouterWrapper';
import { Snippet } from 'react-instantsearch-dom';
import type { Hit } from 'react-instantsearch-core';
import LocalOfferOutlinedIcon from '@material-ui/icons/LocalOfferOutlined';
import { taggingNameCapitalSetting, taggingNameIsSet } from '../../lib/instanceSettings';

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    borderBottom: theme.palette.border.faint
  },
  name: {
    ...theme.typography.body2,
  },
  icon: {
    width: 20,
    color: theme.palette.grey[500],
    marginRight: 12,
    marginLeft: 4
  },
  snippet: {
    ...theme.typography.body2,
    color: theme.palette.text.dim,
    wordBreak: "break-word"
  }
})

const isLeftClick = (event: MouseEvent): boolean => {
  return event.button === 0 && !event.ctrlKey && !event.metaKey;
}

const TagsSearchHit = ({hit, clickAction, classes, showIcon=false}: {
  hit: Hit<any>,
  clickAction?: any,
  classes: ClassesType,
  showIcon?: boolean
}) => {
  const { LWTooltip } = Components
  const tag = hit as AlgoliaTag;

  const showSnippet = hit._snippetResult?.body?.matchLevel !== "none"

  return <div className={classes.root}>
    {showIcon && <LWTooltip title={taggingNameCapitalSetting.get()}>
      <LocalOfferOutlinedIcon className={classes.icon}/>
    </LWTooltip>}
    <Link to={tagGetUrl(tag)} onClick={(event: MouseEvent) => isLeftClick(event) && clickAction && clickAction()}>
      <div className={classes.name}>
        {tag.name}
      </div>
      {showSnippet && <div className={classes.snippet}>
        <Snippet attribute="description" hit={tag} tagName="mark" />
      </div>}
    </Link>
  </div>
}

const TagsSearchHitComponent = registerComponent("TagsSearchHit", TagsSearchHit, {styles});

declare global {
  interface ComponentTypes {
    TagsSearchHit: typeof TagsSearchHitComponent
  }
}

