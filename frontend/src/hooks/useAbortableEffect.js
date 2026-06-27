import { useEffect } from 'react';

/**
 * A thin wrapper around `useEffect` that provides an `isMounted` guard to
 * prevent state updates after a component unmounts.
 *
 * This eliminates the repetitive `let isMounted = true` + cleanup boilerplate
 * that appears across multiple pages and hooks in this project.
 *
 * @param {(isMounted: () => boolean) => (void | (() => void))} fn
 *   Effect callback receiving an `isMounted` getter function.  The callback
 *   may optionally return a cleanup function that will be called on unmount.
 * @param {React.DependencyList} deps  Standard `useEffect` dependency array.
 *
 * @example
 * useAbortableEffect(
 *   (isMounted) => {
 *     fetchData().then((data) => {
 *       if (!isMounted()) return;
 *       setData(data);
 *     });
 *   },
 *   [id],
 * );
 */
export function useAbortableEffect(fn, deps) {
  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;

    const cleanup = fn(isMounted);

    return () => {
      mounted = false;
      if (typeof cleanup === 'function') cleanup();
    };
  // deps are forwarded as-is; the linter rule applies at the call-site.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
