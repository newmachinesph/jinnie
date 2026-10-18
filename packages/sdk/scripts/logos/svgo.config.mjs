// svgo 4: keep the viewBox (the renderer scales by it), inline every style
// rule (react-native-svg has no CSS), and drop tags it does not know.
export default {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          inlineStyles: {onlyMatchedOnce: false},
        },
      },
    },
    // react-native-svg parses style="" itself and chokes on odd declarations;
    // presentation attributes bypass that parser entirely.
    'convertStyleToAttrs',
    'removeTitle',
    'removeDesc',
    'removeXMLNS',
  ],
};
