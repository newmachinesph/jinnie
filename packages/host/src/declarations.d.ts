/* Federated mini apps are loaded by name at runtime; see registry.ts. */

declare module '*.json' {
  const value: any;
  export default value;
  export const name: string;
}
