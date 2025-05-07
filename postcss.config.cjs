const purgecss = require('@fullhuman/postcss-purgecss');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  plugins: {
    autoprefixer: {},
    ...(isProduction && {
      purgecss: purgecss({
        content: [
          './app/**/*.{js,jsx,ts,tsx,html}',
          './pages/**/*.{js,jsx,ts,tsx,html}',
          './components/**/*.{js,jsx,ts,tsx,html}',
        ],
        defaultExtractor: content => content.match(/[^<"'\s>]+/g) || [],
        safelist: [
          // Add any dynamic or third-party classes you want to keep
          /^toggle-switch/, // trendmicro toggle switch
        ],
      }),
    }),
  },
};
