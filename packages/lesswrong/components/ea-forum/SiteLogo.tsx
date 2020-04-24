/*
 * Logo used in the header by the EA Forum
 *
 * Could easily be adapted for other Forums
 */
import React from 'react';
import { registerComponent, Utils } from '../../lib/vulcan-lib';
import { DatabasePublicSetting } from '../../lib/publicSettings';
import { forumTitleSetting } from '../../lib/instanceSettings';

const styles = theme => ({
  root: {
    height: 48
  }
})

export const logoUrlSetting = new DatabasePublicSetting<string | null>('logoUrl', null)

const SiteLogo = ({classes}) => logoUrlSetting.get() ? <span/> : <img
  className={classes.root}
  src={Utils.getLogoUrl()}
  title={forumTitleSetting.get()}
  alt={`${forumTitleSetting.get()} Logo`}
/>

SiteLogo.displayName = "SiteLogo";
const SiteLogoComponent = registerComponent(
  'SiteLogo', SiteLogo, {styles}
)

declare global {
  interface ComponentTypes {
    SiteLogo: typeof SiteLogoComponent
  }
}
