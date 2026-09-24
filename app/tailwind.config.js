/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      primary: {
        300: 'rgb(250, 123, 78)',
        400: 'rgb(250, 123, 78)',
        500: 'rgb(250, 123, 78)',
        600: 'rgb(250, 123, 78)',
        700: 'rgb(250, 123, 78)',
        tones: {
          400: '#676767',
          600: '#323232'
        }
      },
      'cold-blue': {
        500: 'rgb(83, 83, 83)',
        700: 'rgba(83, 83, 83, 0.56)',
        800: 'rgb(31, 31, 31)',
        900: 'rgb(31, 31, 31)',
      },
      'dark-blue': {
        100: 'rgba(250, 123, 78, 0.08)',
        200: 'rgba(255, 255, 255, 0.16)',
        500: 'rgb(24, 24, 24)',
      },
      slate: {
        100: 'rgb(163, 163, 163)',
        500: 'rgb(83, 83, 83)',
        600: 'rgb(83, 83, 83)',
        700: 'rgb(83, 83, 83)',
        800: 'rgb(24, 24, 24)',
        900: 'rgb(24, 24, 24)',
        950: 'rgb(19, 19, 19)',
      },
      gray: {
        200: 'rgba(255, 255, 255, 0.80)',
        300: 'rgba(255, 255, 255, 0.70)',
        400: 'rgba(255, 255, 255, 0.60)',
        500: 'rgba(255, 255, 255, 0.50)',
        600: 'rgba(255, 255, 255, 0.40)',
        800: 'rgba(255, 255, 255, 0.20)',
        900: 'rgba(255, 255, 255, 0.10)',
      },
      yellow: {
        500: 'rgb(243, 181, 12)',
      },
      red: {
        400: 'rgb(255, 84, 84)',
        500: 'rgb(255, 84, 84)',
      },
      green: {
        400: 'rgb(49, 195, 102)',
        500: 'rgb(49, 195, 102)',
      },
      white: 'rgb(255, 255, 255)',
      black: 'rgb(0, 0, 0)',
      stroke: {
        primary: '#535353',
      },
      transparent: 'transparent',
      fill: {
        surface: {
          base: '#181818',
          elevated: '#1F1F1F',
          accent: '#535353',
          hover: 'rgba(163, 163, 163, 0.10)',
        },
        background: '#090A14'
      },
      stakebtnbg: '#323232',
      secondary: '#A3A3A3',
      success: '#31C366'
    },
    spacing: {
      ...Object.fromEntries(
        Array.from({ length: 97 }, (_, i) => [i, `${i}px`])
      ),

      1: '0.1rem',
      2: '0.2rem',
      3: '0.3rem',
      4: '0.4rem',
      5: '0.5rem',
      6: '0.6rem',
      7: '0.7rem',
      8: '0.8rem',
      9: '0.9rem',
      10: '1rem',
      20: '2rem',
      30: '3rem',
      40: '4rem',
      50: '5rem',
      60: '6rem',
      70: '7rem',
      80: '8rem',
      90: '9rem',
      100: '10rem',
    },
    fontSize: {
      12: '1.2rem',
      14: '1.4rem',
      16: '1.6rem',
      24: '2.4rem',
    },
    lineHeight: {
      1: '1',
      base: 'normal',
    },
    extend: {
      zIndex: {
        1000: '1000',
        10000: '10000',
      },
      animation: {
        'slide-up': 'slide-up 200ms ease-out',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'inner-light': 'inset 0 0 3rem 0.5rem rgb(255 255 255 / 1%)',
      },
      backgroundColor: {
        'dark-blue': 'var(--main-bg-color)',
        'dark-blue-100': 'var(--dark-blue-100)',
        'dark-blue-200': 'var(--dark-blue-200)',
      },
      gridTemplateColumns: {
        'auto-fill-350': 'repeat(auto-fill, minmax(350px, 1fr))',
        tooltip: '1fr auto',
      },
      transitionProperty: {
        colors: 'background-color, border-color, color, fill, stroke',
      },
      transitionDuration: {
        200: '200ms',
      },
      letterSpacing: {
        tooltip: '0.4px',
      },
      backdropBlur: {
        tooltip: '10px',
      },
      textUnderlineOffset: {
        tooltip: '2px',
      },
      fontFamily: {
        relative: ['Relative', 'sans-serif'],
      },
    },
    borderRadius: {
      ...Object.fromEntries(
        Array.from({ length: 97 }, (_, i) => [i, `${i}px`])
      ),
      full: '9999px',
    },
  },
  plugins: [
    injectColorsPlugin,
    customUtilsPlugin,
    fontComponentsPlugin,
    tooltipPlugin,
    containerPlugin,
    layoutPlugin,
    globalStylesPlugin,
    fontFacesPlugin,
    rootComponentsPlugin,
    appCardPlugin,
  ],
};

// Color injection plugin
function injectColorsPlugin({ addBase, theme }) {
  function extractColorVars(colorObj, colorGroup = '') {
    return Object.entries(colorObj).reduce((vars, [key, value]) => {
      const newVars =
        typeof value === 'string'
          ? { [`--color${colorGroup}-${key}`]: value }
          : extractColorVars(value, `-${key}`);
      return { ...vars, ...newVars };
    }, {});
  }

  addBase({
    ':root': extractColorVars(theme('colors')),
  });
}

// Custom utilities plugin
function customUtilsPlugin({ addUtilities, addComponents }) {
  addUtilities({
    '.scrollbar-hide': {
      'scrollbar-width': 'none',
      '-ms-overflow-style': 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },
    '.text-muted': {
      color: 'var(--text-gray)',
      opacity: '0.7',
    },
    '.transition-arrow': {
      margin: '0 0.5rem',
      transition: 'transform 0.2s ease-in-out',
    },
  });

  // Add toggle switch component classes
  addComponents({
    '.toggle-switch-wrapper': {
      '@apply text-body-medium flex min-h-[2rem] items-center justify-between':
        {},
    },
    '.toggle-switch': {
      '@apply relative flex cursor-pointer items-center justify-start w-[36px] h-[20px] rounded-full bg-cold-blue-800':
        {},
      border: '1px solid #535353',
      '&.checked': {
        '@apply bg-primary-600': {},
        'border-color': 'transparent',
        'box-shadow': '0px 0px 2px 0px rgb(9 10 20 / 50%)',
      },
      '&.disabled': {
        '@apply cursor-not-allowed opacity-50': {},
      },
    },
    '.toggle-switch-handle': {
      '@apply absolute w-[18px] h-[18px] rounded-full transition-all duration-200 ease-in-out':
        {},
      '&.checked': {
        '@apply left-[16px] bg-white': {},
      },
      '&:not(.checked)': {
        '@apply left-0': {},
        'background-color': '#A3A3A3',
      },
    },
  });
}

// Font components plugin
function fontComponentsPlugin({ addBase, addComponents }) {
  addBase({
    ':root': {
      // Typography variables
      '--font-size-h1': '3.4rem',
      '--font-size-h2': '2.4rem',
      '--font-size-h3': '2rem',
      '--font-size-h4': '1.8rem',
      '--font-size-body-large': '1.6rem',
      '--font-size-body-medium': '1.4rem',
      '--font-size-body-small': '1.2rem',
      '--font-size-caption': '1rem',
      '--font-base': '2rem',

      '--line-height-h1': '34px',
      '--line-height-h2': '24px',
      '--line-height-h3': '2.4rem',
      '--line-height-h4': '2.2rem',
      '--line-height-body-large': '2.1rem',
      '--line-height-body-medium': '1.8rem',
      '--line-height-body-small': '1.6rem',
      '--line-height-caption': '1.4rem',
      '--app-description-line-height': '2.15rem',

      // Container variables
      '--default-container-max-width': '126.4rem',
      '--default-container-padding': '3.2rem',
      '--default-container-padding-mobile': '3.2rem',
      '--container-sm-max-width': '108.8rem',

      // Layout variables
      '--main-bg-color': 'rgb(19, 19, 19)',
      '--dark-blue': 'rgb(24, 24, 24)',
      '--dark-blue-bg': 'rgb(24, 24, 24)',
      '--dark-blue-100': 'rgba(250, 123, 78, 0.08)',
      '--dark-blue-200': 'rgba(255, 255, 255, 0.16)',
      '--dark-blue-active': 'rgba(250, 123, 78, 0.2)',
      '--header-height': '6rem',
      '--page-grid-gap': '2rem',

      // Semantic color variables
      '--green': 'rgb(49, 195, 102)',
      '--error-red': 'rgb(250, 60, 88)',
      '--yellow': 'rgb(243, 181, 12)',
      '--warning-yellow': 'rgb(243, 181, 12)',
      '--app-description-color': 'rgb(183, 183, 189)',
      '--text-gray': 'rgba(255, 255, 255, 0.70)',

      // Button variables
      '--primary-btn-bg': 'rgb(250, 123, 78)',
      '--dark-blue-hover': 'rgba(250, 123, 78, 0.08)',
      '--dark-blue-border': 'rgba(255, 255, 255, 0.16)',

      // Gradient variables
      '--app-cta-gradient':
        'linear-gradient(90deg, rgb(250, 123, 78) 0%, rgb(250, 123, 78) 100%)',
      '--app-box-solid-gradient':
        'linear-gradient(90deg, rgb(20, 21, 38) 0%, rgb(25, 27, 47) 100%)',

      // Button variables
      '--primary-btn-hover':
        'linear-gradient(90deg, rgb(250, 123, 78) 0%, rgb(250, 123, 78) 100%)',
      '--primary-btn-active':
        'linear-gradient(90deg, rgb(250, 123, 78) 0%, rgb(250, 123, 78) 100%)',
      '--button-option-bg': 'rgb(31, 31, 31)',
      '--button-option-hover-bg': 'rgb(50, 50, 50)',
      '--button-option-active-bg': 'rgb(83, 83, 83)',

      // Spacing and sizing variables
      '--letter-spacing-default': '0.05rem',
      '--scrollbar-width': '0rem',
      '--scrollbar-height': '0.6rem',
      '--scrollbar-border-radius': '1.5rem',
      '--tooltip-min-width': '28rem',
      '--button-option-min-height': '36px',

      // Border radius variables
      '--app-card-radius': '0.4rem',
      '--app-cta-radius': '0.3rem',
      '--button-option-radius': '4px',
    },
  });

  addComponents({
    // Heading styles
    '.text-h1': {
      fontSize: 'var(--font-size-h1)',
      lineHeight: 'var(--line-height-h1)',
      fontWeight: '700',
    },
    '.text-h2': {
      fontSize: 'var(--font-size-h2)',
      lineHeight: 'var(--line-height-h2)',
      fontWeight: '600',
    },
    '.text-h3': {
      fontSize: 'var(--font-size-h3)',
      lineHeight: 'var(--line-height-h3)',
      fontWeight: '600',
    },
    '.text-h4': {
      fontSize: 'var(--font-size-h4)',
      lineHeight: 'var(--line-height-h4)',
      fontWeight: '600',
    },

    // Body text styles
    '.text-body-large': {
      fontSize: 'var(--font-size-body-large)',
      lineHeight: 'var(--line-height-body-large)',
    },
    '.text-body-medium': {
      fontSize: 'var(--font-size-body-medium)',
      lineHeight: 'var(--line-height-body-medium)',
    },
    '.text-body-small': {
      fontSize: 'var(--font-size-body-small)',
      lineHeight: 'var(--line-height-body-small)',
    },
    '.text-caption': {
      fontSize: 'var(--font-size-caption)',
      lineHeight: 'var(--line-height-caption)',
    },

    // Responsive heading styles for different screen sizes
    '.text-h1-sm': {
      fontSize: '2.5rem',
      lineHeight: '1.2',
      fontWeight: '700',
    },
    '.text-h1-md': {
      fontSize: '4rem',
      lineHeight: '1.1',
      fontWeight: '700',
    },
    '.text-h1-lg': {
      fontSize: '5rem',
      lineHeight: '1.1',
      fontWeight: '700',
    },
    '.text-h3-sm': {
      fontSize: '2rem',
      lineHeight: '1.3',
      fontWeight: '600',
    },
    '.text-h3-md': {
      fontSize: '2.5rem',
      lineHeight: '1.2',
      fontWeight: '600',
    },
    '.text-h3-lg': {
      fontSize: '3rem',
      lineHeight: '1.1',
      fontWeight: '600',
    },
  });
}

// Tooltip components plugin
function tooltipPlugin({ addComponents }) {
  const tooltipSurface = {
    backgroundColor: '#1f1f1f',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 0.8rem 2rem rgb(0 0 0 / 30%)',
  };

  addComponents({
    '.tooltip-base': {
      '@apply z-10000 w-max max-w-screen-sm rounded-6 p-10 text-body-small font-normal tracking-tooltip text-left whitespace-normal shadow-lg backdrop-blur-tooltip':
        {},
      ...tooltipSurface,
      lineHeight: '125%',
      'min-width': 'var(--tooltip-min-width)',
      '@media (max-width: 768px)': {
        minWidth: '200px',
      },
    },
    '.Tooltip-popup': {
      ...tooltipSurface,
    },
    '.Tooltip-popup .Tooltip-divider': {
      backgroundColor: '#535353',
    },
    '.tooltip-handle': {
      '@apply relative inline-flex cursor-help underline decoration-dashed decoration-1 underline-offset-tooltip':
        {},
    },
    '.tooltip-container': {
      '@apply relative': {},
    },
    '.tooltip-disabled-handle': {
      '@apply pointer-events-none w-full flex-none [text-decoration:inherit]':
        {},
    },
    '.tooltip-row': {
      '@apply grid grid-cols-tooltip mb-2': {},
    },
    '.tooltip-divider': {
      '@apply h-[1px] my-2 bg-gray-500': {},
    },
    '.tooltip-link': {
      '@apply text-gray-300 underline': {},
    },
  });
}

// Container components plugin
function containerPlugin({ addComponents }) {
  addComponents({
    // Default container
    '.default-container': {
      maxWidth: 'var(--default-container-max-width)',
      margin: '0 auto',
      paddingRight: 'var(--default-container-padding)',
      paddingLeft: 'var(--default-container-padding)',
      '@media (max-width: 600px)': {
        paddingRight: 'var(--default-container-padding-mobile)',
        paddingLeft: 'var(--default-container-padding-mobile)',
      },
    },

    // Default container with one-sided padding on mobile
    '.default-container-mobile-one-sided': {
      maxWidth: 'var(--default-container-max-width)',
      margin: '0 auto',
      paddingRight: 'var(--default-container-padding)',
      paddingLeft: 'var(--default-container-padding)',
      '@media (max-width: 600px)': {
        maxWidth: 'none',
        marginLeft: 'var(--default-container-padding-mobile)',
        paddingLeft: '0',
      },
      '@media (max-width: 1264px)': {
        maxWidth: 'none',
        marginLeft: 'var(--default-container-padding)',
        paddingLeft: '0',
      },
    },

    // Small default container
    '.default-sm-container': {
      maxWidth: 'var(--container-sm-max-width)',
      margin: '0 auto',
      paddingRight: 'var(--default-container-padding)',
      paddingLeft: 'var(--default-container-padding)',
      '@media (max-width: 600px)': {
        paddingRight: 'var(--default-container-padding-mobile)',
        paddingLeft: 'var(--default-container-padding-mobile)',
      },
    },

    // Additional utility classes for containers
    '.container-fluid': {
      width: '100%',
      paddingRight: 'var(--default-container-padding)',
      paddingLeft: 'var(--default-container-padding)',
      '@media (max-width: 600px)': {
        paddingRight: 'var(--default-container-padding-mobile)',
        paddingLeft: 'var(--default-container-padding-mobile)',
      },
    },

    '.container-centered': {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },

    '.container-flex': {
      display: 'flex',
    },

    '.container-flex-column': {
      display: 'flex',
      flexDirection: 'column',
    },
  });
}

// Layout components plugin
function layoutPlugin({ addComponents }) {
  addComponents({
    // Page container
    '.page-container': {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'var(--main-bg-color)',
    },

    // Page layout
    '.page-layout': {
      display: 'flex',
      flex: '1',
      flexDirection: 'column',
      minHeight: 'calc(100vh - var(--header-height))',
    },

    // Full-width layout
    '.page-layout-full': {
      width: '100%',
      maxWidth: 'none',
    },

    // Centered content layout
    '.page-layout-centered': {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Two-column layout
    '.page-layout-two-column': {
      display: 'flex',
      flexWrap: 'wrap',
      '@media (min-width: 768px)': {
        flexWrap: 'nowrap',
      },
      '.column': {
        flex: '1 1 100%',
        '@media (min-width: 768px)': {
          flex: '1 1 50%',
        },
      },
    },

    // Sidebar layout
    '.page-layout-sidebar': {
      display: 'flex',
      flexDirection: 'column',
      '@media (min-width: 768px)': {
        flexDirection: 'row',
      },
      '.sidebar': {
        flex: '0 0 100%',
        '@media (min-width: 768px)': {
          flex: '0 0 25%', // Adjust this value based on your desired sidebar width
        },
      },
      '.main-content': {
        flex: '1',
      },
    },

    // Grid layout
    '.page-layout-grid': {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 'var(--page-grid-gap)',
    },

    // Sticky header layout
    '.page-layout-sticky-header': {
      '.header': {
        position: 'sticky',
        top: '0',
        zIndex: '1000',
        backgroundColor: 'var(--main-bg-color)',
      },
    },

    // Sticky footer layout
    '.page-layout-sticky-footer': {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      '.main-content': {
        flex: '1',
      },
      '.footer': {
        flexShrink: '0',
      },
    },
  });
}

// Global styles plugin
function globalStylesPlugin({ addBase, addComponents, addUtilities }) {
  // Add base styles
  addBase({
    'html, body, #root': {
      margin: '0',
      padding: '0',
      backgroundColor: 'var(--main-bg-color)',
      fontSize: '10px',
      color: 'white',
    },
    body: {
      margin: '0',
      fontFamily: 'Relative, sans-serif',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
    code: {
      fontFamily:
        'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',
    },
    '*, *::before, *::after': {
      fontFamily: 'Relative, sans-serif',
      letterSpacing: 'var(--letter-spacing-default)',
      boxSizing: 'border-box',
    },
    '::-webkit-scrollbar': {
      width: 'var(--scrollbar-width)',
      height: 'var(--scrollbar-height)',
    },
    '::-webkit-scrollbar-track': {
      background: 'var(--color-slate-800)',
    },
    '::-webkit-scrollbar-thumb': {
      borderRadius: 'var(--scrollbar-border-radius)',
      background: 'var(--color-slate-100)',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: 'rgb(179, 180, 194)',
    },
    a: {
      color: 'white',
    },
    'input::-webkit-outer-spin-button, input::-webkit-inner-spin-button': {
      margin: '0',
      WebkitAppearance: 'none',
    },
    'input[type="number"]': {
      MozAppearance: 'textfield',
      appearance: 'none',
    },
    input: {
      padding: '1rem',
      border: 'none',
      background: 'none',
      fontSize: 'var(--font-base)',
      color: 'white',
      outline: 'none',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
    button: {
      cursor: 'pointer',
      outline: 'none',
    },
    'button.btn-link': {
      display: 'block',
      marginTop: '1.5rem',
      padding: '0',
      border: 'none',
      background: 'none',
      fontSize: 'var(--font-base)',
      textAlign: 'left',
      color: 'white',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  });

  // Add semantic color utilities
  addUtilities({
    '.positive': {
      color: 'var(--green)',
    },
    '.negative': {
      color: 'var(--error-red)',
    },
    '.warning': {
      color: 'var(--yellow)',
    },
  });
}

// Font faces plugin
function fontFacesPlugin({ addBase }) {
  addBase({
    '@font-face': [
      {
        fontFamily: 'Relative',
        fontWeight: '400',
        fontStyle: 'normal',
        src: "url('@/fonts/relative/tthoves-pro-regular.ttf')",
        unicodeRange: undefined,
        // src: "local(''), url('@/fonts/relative/relative-book-pro.eot?#iefix') format('embedded-opentype'), url('@/fonts/relative/relative-book-pro.woff2') format('woff2'), url('@/fonts/relative/relative-book-pro.woff') format('woff'), url('@/fonts/relative/relative-book-pro.ttf') format('truetype')",
      },
      {
        fontFamily: 'Relative',
        fontWeight: '500',
        fontStyle: 'normal',
        src: "url('@/fonts/relative/tthoves-pro-medium.ttf')",
        unicodeRange: undefined,
      }
      // {
      //   fontFamily: 'Relative',
      //   src: "url('@/fonts/roboto/roboto-v30-latin-regular.eot')",
      //   unicodeRange: 'U+30-39',
      //   src: "local(''), url('@/fonts/roboto/roboto-v30-latin-regular.eot?#iefix') format('embedded-opentype'), url('@/fonts/roboto/roboto-v30-latin-regular.woff2') format('woff2'), url('@/fonts/roboto/roboto-v30-latin-regular.woff') format('woff'), url('@/fonts/roboto/roboto-v30-latin-regular.ttf') format('truetype')",
      // },
      // {
      //   fontFamily: 'Relative',
      //   src: "url('@/fonts/inter/inter-v12-latin-regular.eot')",
      //   unicodeRange: 'U+002C, U+002E',
      //   src: "local(''), url('@/fonts/inter/inter-v12-latin-regular.eot?#iefix') format('embedded-opentype'), url('@/fonts/inter/inter-v12-latin-regular.woff2') format('woff2'), url('@/fonts/inter/inter-v12-latin-regular.woff') format('woff'), url('@/fonts/inter/inter-v12-latin-regular.ttf') format('truetype')",
      // },
      // {
      //   fontFamily: 'RelativeNumber',
      //   fontWeight: '400',
      //   fontStyle: 'normal',
      //   src: "url('@/fonts/relative/relative-book-pro.eot')",
      //   unicodeRange: undefined,
      //   src: "local(''), url('@/fonts/relative/relative-book-pro.eot?#iefix') format('embedded-opentype'), url('@/fonts/relative/relative-book-pro.woff2') format('woff2'), url('@/fonts/relative/relative-book-pro.woff') format('woff'), url('@/fonts/relative/relative-book-pro.ttf') format('truetype')",
      // },
    ],
  });
}

// Root components plugin
function rootComponentsPlugin({ addComponents }) {
  addComponents({
    '.App': {
      position: 'relative',
      minHeight: '100%',
      fontSize: 'var(--font-size-body-medium)',
      overflow: 'hidden',
      background: '#131313',
    },
    '.App-card': {
      padding: '1rem',
      borderRadius: 'var(--app-card-radius)',
      fontSize: 'var(--font-size-body-medium)',
    },
    '.App-content': {
      position: 'static !important',
      header: {
        position: 'relative',
        zIndex: '800',
        height: '100%',
      },
    },
    '.App-icon': {
      marginBottom: '0.5rem',
      verticalAlign: 'middle',
    },
    '.App-cta': {
      display: 'inline-block',
      padding: '0.8rem',
      border: 'none',
      borderRadius: 'var(--app-cta-radius)',
      fontSize: 'var(--font-size-body-small)',
      textAlign: 'center',
      cursor: 'pointer',
      '&, &:link, &:visited': {
        background: 'var(--app-cta-gradient)',
        color: 'white',
        textDecoration: 'none',
      },
      '&:hover:enabled': {
        background: 'var(--primary-btn-hover)',
      },
      '&:active:enabled': {
        background: 'var(--primary-btn-active)',
      },
      '&.small': {
        padding: '0.8rem',
      },
      '&.transparent': {
        background: 'none',
        color: 'rgb(255 255 255 / 70%)',
        opacity: '1',
        boxShadow: 'none',
        '&:hover:enabled': {
          background: 'none',
          color: 'white',
          boxShadow: 'none',
        },
      },
      '&.option': {
        padding: '0.8rem 1rem',
        fontSize: 'var(--font-size-body-small)',
      },
      '&.default-cursor': {
        cursor: 'default',
      },
      '&:disabled': {
        opacity: '0.9',
        cursor: 'not-allowed',
        boxShadow: 'none',
      },
    },
    '.App-button': {
      '&.button': {
        display: 'inline-block',
        width: '90%',
        maxWidth: '46.5rem',
        fontSize: '1.7rem',
        textAlign: 'center',
      },
      '&-option': {
        position: 'relative',
        display: 'inline-flex !important',
        alignItems: 'center',
        minHeight: 'var(--button-option-min-height)',
        paddingRight: '16px',
        paddingLeft: '16px',
        border: 'none',
        borderRadius: 'var(--button-option-radius)',
        background: 'var(--button-option-bg)',
        fontSize: 'var(--font-size-body-small)',
        fontWeight: 'normal',
        lineHeight: '2rem',
        letterSpacing: '0',
        color: 'white',
        cursor: 'pointer',
        textDecoration: 'none',
        boxSizing: 'border-box',
        '&:hover:enabled': {
          background: 'var(--button-option-hover-bg)',
        },
        '&:active:enabled': {
          background: 'var(--button-option-active-bg)',
        },
        '&:disabled': {
          cursor: 'not-allowed',
        },
      },
    },
    '.App-box, .App-card, .App-card-primary, .App-box-highlight, .App-box-solid':
    {
      position: 'relative',
      borderRadius: 'var(--app-card-radius)',
      // background: 'var(--color-slate-950)',
      background: '#181818',
      fontSize: 'var(--font-size-body-medium)',
    },
    '.App-box-solid': {
      background: 'var(--app-box-solid-gradient)',
    },
    '.Page': {
      maxWidth: '108.5rem',
      margin: 'auto',
      paddingTop: '2.65rem',
    },
    '.Page-content': {
      padding: '4.65rem',
      paddingTop: '1rem',
    },
    '.Page-description': {
      fontSize: 'var(--font-size-body-medium)',
      lineHeight: 'var(--app-description-line-height)',
      color: 'var(--app-description-color)',
      'span, a': {
        display: 'inline-flex',
        color: 'inherit',
        cursor: 'pointer',
        textDecoration: 'underline',
        '&:hover': {
          color: 'var(--color-white)',
          opacity: '0.9',
        },
        img: {
          marginLeft: '0.4rem',
        },
      },
    },
    '@media (min-width: 769px)': {
      '.App-cta.small': {
        height: '4rem',
        padding: '0.8rem',
        display: 'flex',
        alignItems: 'center',
      },
      '.App-subtitle': {
        marginBottom: '4.65rem',
      },
    },
    '@media (max-width: 768px)': {
      '.App-cta.small': {
        height: '3.2rem',
        padding: '0 1.2rem',
        display: 'flex',
        alignItems: 'center',
      },
    },
    '@media (max-width: 450px)': {
      '.mobile-cross-menu': {
        marginRight: '1.2rem',
      },
      '.Home-faqs-content': {
        paddingLeft: '1rem',
      },
    },
    '*': {
      WebkitTapHighlightColor: 'rgb(0 0 0 / 0%)',
    },
  });
}

// AppCard components plugin
function appCardPlugin({ addComponents }) {
  addComponents({
    '.App-card-row': {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      padding: 'unset',
      gridColumnGap: '1rem',
      '&.inner': {
        paddingLeft: '1rem',
      },
      '.label': {
        minWidth: 'max-content',
        color: 'var(--color-slate-100)',
        opacity: '1',
      },
      '.icon': {
        position: 'relative',
        top: '2px',
        marginLeft: '0.31rem',
        verticalAlign: 'baseline',
      },
      '> div:last-child': {
        textAlign: 'right',
      },
    },
    '.App-card-divider': {
      height: '1px',
      margin: '1rem -1rem',
      background: '#535353',
      '&:last-child': {
        display: 'none',
      },
      '&-vertical': {
        width: '1px',
        height: '8.8rem',
        margin: '0',
        background: '#A3A3A3',
      },
    },
    '.App-card-title': {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
      fontSize: 'var(--font-size-body-large)',
      fontWeight: 'normal',
      lineHeight: '2rem',
      letterSpacing: '0',
      color: '#fff',
      '&-small': {
        display: 'inline-flex',
        fontSize: 'var(--font-size-body-large)',
      },
      '&-mark': {
        display: 'flex',
        alignItems: 'center',
        '&-icon': {
          position: 'relative',
          display: 'flex',
          marginRight: '0.8rem',
          '.selected-network-symbol': {
            position: 'absolute',
            right: '0',
            bottom: '0',
            border: '1px solid #535353',
            borderRadius: '50%',
          },
        },
        '&-info': {
          '&-title': {
            fontSize: 'var(--font-size-body-large)',
            lineHeight: '2.1rem',
            letterSpacing: '0',
            color: '#fff',
          },
          '&-subtitle': {
            fontSize: '1.2rem',
            lineHeight: '1rem',
            letterSpacing: '0',
            color: '#A3A3A3',
          },
        },
      },
      '&-icon': {
        display: 'flex',
        marginLeft: '1.2rem',
        'img + img': {
          marginLeft: '0.6rem',
        },
      },
      '&-block': {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1.6rem',
      },
      '&-info': {
        display: 'flex',
        '&-icon': {
          display: 'flex',
          marginRight: '0.8rem',
        },
      },
      '&-iconlist': {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridGap: '0.8rem',
        '&___icon': {
          img: {
            filter: 'grayscale(1)',
            '&:hover': {
              filter: 'unset',
            },
          },
        },
      },
    },
    '.App-card-space-between': {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    '.App-card-bottom': {
      position: 'absolute',
      right: '0',
      bottom: '0',
      left: '0',
      padding: '1rem',
      paddingBottom: '1.8rem',
      '&-placeholder': {
        visibility: 'hidden',
      },
      '.App-card-divider, &-placeholder .App-card-divider': {
        marginBottom: '1.8rem',
      },
    },
    '.App-card-long': {
      marginBottom: '2.4rem',
      background: '#181818',
      '&-content': {
        display: 'flex',
        padding: '1.6rem 0',
      },
      '&_sub': {
        width: '20%',
        padding: '0 1.6rem',
        '&__info': {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginLeft: '0.8rem',
          '&___title': {
            fontSize: 'var(--font-size-body-large)',
            fontWeight: 'normal',
            lineHeight: '2.1rem',
            letterSpacing: '0',
            color: '#fff',
          },
          '&___subtitle': {
            fontSize: '1.2rem',
            fontWeight: 'normal',
            lineHeight: '1rem',
            letterSpacing: '0',
            color: '#A3A3A3',
          },
        },
        '&-left': {
          display: 'flex',
        },
        '&-icon': {
          display: 'flex',
        },
        '&__iconlist': {
          display: 'flex',
          alignItems: 'center',
          marginLeft: 'auto',
          '&___icon': {
            marginLeft: '0.8rem',
            img: {
              filter: 'grayscale(1)',
              '&:hover': {
                filter: 'unset',
              },
            },
          },
        },
        '&:first-child': {
          display: 'flex',
          alignItems: 'center',
        },
        '&__title': {
          marginBottom: '0.8rem',
          fontSize: 'var(--font-size-body-small)',
          fontWeight: 'normal',
          lineHeight: '1.8rem',
          letterSpacing: '0.25px',
          color: '#A3A3A3',
        },
        '&__subtitle': {
          fontSize: '2rem',
          fontWeight: 'normal',
          lineHeight: '2.6rem',
          letterSpacing: '0.36px',
          color: 'white',
        },
      },
    },
    '.App-card-info': {
      '&-title': {
        fontSize: 'var(--font-size-body-medium)',
        fontWeight: 'normal',
        lineHeight: '2.1rem',
        letterSpacing: '0',
        color: '#fff',
      },
      '&-subtitle': {
        fontSize: '1.2rem',
        fontWeight: 'normal',
        lineHeight: '1rem',
        letterSpacing: '0',
        color: '#A3A3A3',
      },
    },
    '.App-card-option': {
      margin: '0.62rem',
    },
    '.App-card-options': {
      margin: '-0.62rem',
      padding: 'unset',
    },
    '.App-card-content': {
      display: 'grid',
      gridRowGap: '0.8rem',
    },
    '@media (max-width: 1200px)': {
      '.App-card-long-content.card-list': {
        gridTemplateColumns: '1fr 1fr',
      },
    },
    '@media (max-width: 1000px)': {
      '.App-card-long-content': {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridRowGap: '1rem',
      },
      '.App-card-divider-vertical': {
        display: 'none',
      },
      '.App-card-long_sub': {
        width: '100%',
      },
    },
    '@media (max-width: 700px)': {
      '.App-card-long-content': {
        gridTemplateColumns: '1fr 1fr',
      },
    },
    '@media (max-width: 600px)': {
      '.App-card-long-content.card-list': {
        gridTemplateColumns: '1fr',
      },
      '.App-card-long-content': {
        gridTemplateColumns: '1fr',
      },
    },
  });
}
