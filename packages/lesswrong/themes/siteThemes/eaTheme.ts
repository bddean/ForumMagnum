import { createMuiTheme } from '@material-ui/core/styles';
import type { PartialDeep } from 'type-fest'
import { themeMetadata } from '../themeNames';

const titleStack = [
  'GreekFallback', // Ensures that greek letters render consistently
  'Raleway',
  'Helvetica Neue',
  'Helvetica',
  'Arial',
  'sans-serif'
].join(',')

const serifStack = [
  'Merriweather',
  'Baskerville',
  'Libre Baskerville',
  'Georgia',
  'serif'
].join(',')

// TODO why is SanSerifStack different from titleStack?
const sansSerifStack = [
  'GreekFallback', // Ensures that greek letters render consistently
  'Merriweather Sans',
  'Lato',
  'Helvetica Neue',
  'Helvetica',
  'Arial',
  'sans-serif'
].join(',')


const defaultTheme = createMuiTheme()

export const eaForumTheme: SiteThemeSpecification = {
  shadePalette: {
    fonts: {sansSerifStack, serifStack},
  },
  componentPalette: (shadePalette: ThemeShadePalette) => ({
    primary: {
      main: '#0c869b',
      light: '#00b2be',
      dark: '#085d6c'
    },
    secondary: {
      main: '#0c869b',
      light: '#3c9eaf',
      dark: '#085d6c'
    },
    lwTertiary: {
      main: "#137283",
      dark: "#137283",
    },
    error: {
      main: "#bf360c",
    },
    background: {
      default: shadePalette.type === 'light' ? '#f6f8f9' : shadePalette.grey[60],
    },
    header: {
      text: shadePalette.type === 'light' ? "rgba(0,0,0,.87)" : shadePalette.greyAlpha(.87),
      background: shadePalette.type === 'light' ? '#ffffff' : shadePalette.grey[30],
    },
    event: '#0C869B',
    group: '#538747',
    individual: '#BF577D',
    icon: {
      navigationSidebarIcon: shadePalette.greyAlpha(0.5),
    }
  }),
  make: (palette: ThemePalette) => {
    const basicText = {
      color: palette.grey[900],
      // use ems (not rems) to preserve relative height even if font-size is changed
      lineHeight: '1.75em',
      fontWeight: 400,
      fontFamily: serifStack
    }
    return {
      typography: {
        fontDownloads: [
          "https://fonts.googleapis.com/css?family=Merriweather:300,400,500,600,700&subset=all",
          "https://fonts.googleapis.com/css?family=Raleway:300,400,500,600,700",
          // TODO we use these?
          "https://fonts.googleapis.com/css?family=Lato:300,400,500,600,700",
          "https://fonts.googleapis.com/css?family=Merriweather+Sans:300,400,500,600,700",
          // TODO we need to find where this is used in material ui and remove
          "https://fonts.googleapis.com/css?family=Roboto:300,400,500",
        ],
        fontFamily: sansSerifStack,
        body1: {
          ...basicText,
          fontSize: "1.2rem",
          fontFamily: serifStack,
        },
        body2: {
          fontSize: "1.1rem",
          lineHeight: "1.5em"
        },
        postStyle: {
          ...basicText,
        },
        headerStyle: {
          fontFamily: titleStack
        },
        commentStyle: {
          fontFamily: sansSerifStack,
        },
        errorStyle: {
          color: palette.error.main,
          fontFamily: sansSerifStack
        },
        headline: {
          fontFamily: serifStack,
        },
        subheading: {
          fontFamily: titleStack
        },
        title: {
          color: palette.grey[800],
          fontFamily: titleStack,
          fontWeight: 500,
          marginBottom: 5,
        },
        // used by h3
        display0: {
          color: palette.grey[800],
          fontFamily: titleStack,
          fontWeight: 500,
          fontSize: '1.6rem',
          lineHeight: '1.25em',
        },
        // used by h2
        display1: {
          color: palette.grey[800],
          fontFamily: titleStack,
          fontWeight: 500,
          fontSize: '2rem',
          lineHeight: '1.25em',
        },
        // used by h1
        display2: {
          color: palette.grey[800],
          fontFamily: titleStack,
          fontWeight: 500,
          fontSize: '2.4rem',
          lineHeight: '1.25em',
        },
        // used by page title
        display3: {
          color: palette.grey[800],
          fontFamily: titleStack,
          fontWeight: 500,
          lineHeight: '1.25em'
        },
        uiSecondary: {
          sansSerifStack
        }
      },
      overrides: {
        MuiTooltip: {
          tooltip: {
            fontSize: "1rem",
            padding: ".7rem",
          }
        },
        Header: {
          root: {
            height: 90,
            '@media (max-width: 959.95px) and (min-width: 600px)': {
              height: 86, // I don't know why headroom shifts by 4 pixels, don't ask me
            },
            [defaultTheme.breakpoints.down('xs')]: {
              height: 77,
            },
          },
          appBar: {
            padding: 11,
            '@media (min-width: 960px)': {
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 13,
              paddingBottom: 13,
            }
          },
        },
        MetaInfo: {
          root: {
            fontFamily: sansSerifStack
          }
        },
        SectionTitle: {
          title: {
            fontSize: 25
          }
        },
        PostsVote: {
          voteScore: {
            paddingTop:4,
            paddingBottom:2,
            paddingLeft:1,
            paddingRight:0,
            fontSize: '50%',
          },
        },
        PostsTopSequencesNav: {
          root: {
            marginBottom: -8,
          },
          title: {
            marginTop: -5,
            textTransform: 'lowercase',
            color: 'rgba(0,0,0,.7)',
            fontWeight: 500,
          }
        },
        FilterMode: {
          selected: {
            color: palette.primary.main
          }
        },
        NavigationStandalone: {
          sidebar: {
            top: 26,
          },
          footerBar: {
            backgroundColor: palette.grey[200],
          }
        },
        TabNavigationMenu: {
          divider: {
            marginTop: 10,
            marginBottom: 20,
          }
        },
        TabNavigationItem: {
          navButton: {
            paddingTop: 10,
            paddingBottom: 10,
          },
          icon: {
            opacity: 1,
          },
          navText: {
            color: palette.grey[800]
          }
        },
        TabNavigationFooterItem: {
          selected: {
            backgroundColor: palette.secondary.main
          }
        },
        TabNavigationCompressedItem: {
          icon: {
            opacity: 1
          }
        },
        TabNavigationMenuSubItem: {
          root: {
            color: palette.grey[800]
          }
        },
        PostsPageTitle: {
          root: {
            lineHeight: 1.25
          }
        },
        PostsTimeBlock: {
          divider: {
            display: 'none'
          }
        },
        SequencesPage: {
          root: {
            paddingTop: 345,
          },
          banner: {
            top: 77,
          },
        },
        AllTagsPage: {
          root: {
            maxWidth: 900,
          },
          topSection: {
            maxWidth: 900,
          },
          portal: {
            background: palette.grey[0],
            marginTop: 'unset',
            marginBottom: 'unset',
            padding: '20px',
            boxShadow: "0 1px 5px rgba(0,0,0,.025)",
          }
        },
        TagSmallPostLink: {
          wrap: {
            lineHeight: '1.2em'
          }
        },
        TagsDetailsItem: {
          description: {
            maxWidth: 490,
          }
        },
        ContentType: {
          root: {
            color: palette.grey[800],
            fontWeight: 600
          },
          icon: {
            color: palette.grey[800]
          }
        },
        MuiSnackbarContent: {
          root: {
            backgroundColor: palette.lwTertiary.main
          }
        }
      }
    }
  },
};
