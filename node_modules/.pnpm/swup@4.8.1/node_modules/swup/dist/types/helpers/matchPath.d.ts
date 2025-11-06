import type { Path, ParseOptions, TokensToRegexpOptions, RegexpToFunctionOptions, MatchFunction } from 'path-to-regexp';
export { type Path };
/** Create a match function from a path pattern that checks if a URLs matches it. */
export declare const matchPath: <P extends object = object>(path: Path, options?: ParseOptions & TokensToRegexpOptions & RegexpToFunctionOptions) => MatchFunction<P>;
//# sourceMappingURL=matchPath.d.ts.map