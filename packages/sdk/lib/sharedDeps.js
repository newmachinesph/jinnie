/**
 * Every dependency shared between the host and the mini apps, as Module
 * Federation singletons. One copy at runtime — a second `react-native` or a
 * second `zustand` would mean a second Wallet ledger.
 *
 * @param {{ eager: boolean }} options `eager: true` in the host (it owns the
 *   binary and loads them up front), `eager: false` in every mini app.
 */
const getSharedDependencies = ({eager = true}) => {
  const dependencies = require('./dependencies.json');

  return Object.fromEntries(
    Object.entries(dependencies)
      .filter(([, props]) => props.shared !== false)
      .map(([dep, {version}]) => [
        dep,
        {singleton: true, eager, version, requiredVersion: version},
      ]),
  );
};

module.exports = getSharedDependencies;
