import dependencies from '../lib/dependencies.json';

/** This build's SDK. Apps that need a newer one are hidden from the launcher. */
export const SDK_VERSION: string = dependencies['@jinnie/sdk'].version;

type SharedDepEntry = {version: string; shared?: boolean};
type SharedDepsMap = Record<
  string,
  {singleton: boolean; eager: boolean; version: string; requiredVersion: string}
>;

export function getSharedDependencies({eager}: {eager: boolean}): SharedDepsMap {
  return Object.fromEntries(
    Object.entries(dependencies as Record<string, SharedDepEntry>)
      .filter(([, props]) => props.shared !== false)
      .map(([dep, {version}]) => [
        dep,
        {singleton: true, eager, version, requiredVersion: version},
      ]),
  );
}
