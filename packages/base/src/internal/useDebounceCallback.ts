import { useEffect, useRef } from "react";

/**
 * Options for the debounce callback hook.
 */
export interface DebounceOptions<T = unknown> {
  /**
   * Debounce delay in milliseconds.
   * @default 300
   */
  delay?: number;

  /**
   * Fire on the leading edge of the timeout.
   * @default false
   */
  leading?: boolean;

  /**
   * Fire on the trailing edge of the timeout.
   * @default true
   */
  trailing?: boolean;

  /**
   * Maximum time the callback can be delayed before it's invoked.
   * Useful for ensuring the callback eventually fires during continuous input.
   */
  maxWait?: number;

  /**
   * Custom equality function to determine if the value has changed.
   * When provided, the callback won't fire if the new value equals the last called value.
   * @default undefined (no equality check, always fires)
   */
  equalityFn?: (left: T, right: T) => boolean;
}

/**
 * Control functions returned alongside the debounced callback.
 */
export interface DebounceControlFunctions {
  /** Cancel any pending invocation. */
  cancel: () => void;
  /** Immediately invoke any pending callback. */
  flush: () => void;
  /** Check if there's a pending invocation. */
  isPending: () => boolean;
}

export type DebouncedCallback<T> = ((value: T) => void) & DebounceControlFunctions;

const DEFAULT_DELAY = 300;

/**
 * Creates a debounced callback with configurable leading/trailing edge behavior.
 *
 * Similar to lodash.debounce but implemented as a React hook with proper cleanup.
 *
 * @example
 * ```tsx
 * // Trailing only (default) - good for search-as-you-type
 * const debouncedSearch = useDebounceCallback(
 *   (query) => fetchResults(query),
 *   { delay: 300 }
 * );
 *
 * // Leading + trailing - good for form auto-submit
 * // Instant feedback for Select/Radio, debounced for rapid typing
 * const debouncedSubmit = useDebounceCallback(
 *   (values) => submitForm(values),
 *   { delay: 300, leading: true, trailing: true }
 * );
 *
 * // With equality check to prevent duplicate calls
 * const debouncedSubmit = useDebounceCallback(
 *   (values) => submitForm(values),
 *   {
 *     delay: 300,
 *     leading: true,
 *     trailing: true,
 *     equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b)
 *   }
 * );
 * ```
 */
export function useDebounceCallback<T>(
  callback: (value: T) => void,
  options?: DebounceOptions<T>,
): DebouncedCallback<T> {
  const {
    delay = DEFAULT_DELAY,
    leading = false,
    trailing = true,
    maxWait,
    equalityFn,
  } = options ?? {};

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCallTimeRef = useRef<number | null>(null);
  const lastInvokeTimeRef = useRef<number>(0);
  const pendingValueRef = useRef<T | null>(null);
  const lastCalledValueRef = useRef<T | undefined>(undefined);
  const hasLeadingCalledRef = useRef(false);
  const callbackRef = useRef(callback);

  // Keep callback ref updated to avoid stale closures
  callbackRef.current = callback;

  const invokeCallback = (value: T) => {
    // Check equality if equalityFn is provided
    if (equalityFn && lastCalledValueRef.current !== undefined) {
      if (equalityFn(lastCalledValueRef.current, value)) {
        return; // Skip if values are equal
      }
    }
    lastCalledValueRef.current = value;
    lastInvokeTimeRef.current = Date.now();
    callbackRef.current(value);
  };

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const cancel = () => {
    clearTimers();
    pendingValueRef.current = null;
    hasLeadingCalledRef.current = false;
    lastCallTimeRef.current = null;
  };

  const flush = () => {
    if (pendingValueRef.current !== null && timeoutRef.current) {
      clearTimers();
      invokeCallback(pendingValueRef.current);
      pendingValueRef.current = null;
      hasLeadingCalledRef.current = false;
    }
  };

  const isPending = () => timeoutRef.current !== null;

  const debouncedFn = (value: T) => {
    const now = Date.now();
    const isFirstCall = lastCallTimeRef.current === null;
    lastCallTimeRef.current = now;

    // Store value for potential trailing call
    pendingValueRef.current = value;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Leading edge
    if (leading && (isFirstCall || !hasLeadingCalledRef.current)) {
      hasLeadingCalledRef.current = true;
      invokeCallback(value);
    }

    // Set up maxWait timeout if specified
    if (maxWait !== undefined && !maxWaitTimeoutRef.current) {
      const timeSinceLastInvoke = now - lastInvokeTimeRef.current;
      const remainingMaxWait = Math.max(0, maxWait - timeSinceLastInvoke);

      maxWaitTimeoutRef.current = setTimeout(() => {
        maxWaitTimeoutRef.current = null;
        if (pendingValueRef.current !== null) {
          invokeCallback(pendingValueRef.current);
          pendingValueRef.current = null;
          // Reset for next cycle
          clearTimers();
          hasLeadingCalledRef.current = false;
        }
      }, remainingMaxWait);
    }

    // Set up trailing edge timeout
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;

      // Trailing edge
      if (trailing && pendingValueRef.current !== null) {
        // Only invoke if we haven't just invoked with the same value on leading edge
        const shouldInvoke = !leading || !hasLeadingCalledRef.current || 
          (equalityFn 
            ? !equalityFn(lastCalledValueRef.current as T, pendingValueRef.current)
            : lastCalledValueRef.current !== pendingValueRef.current);
        
        if (shouldInvoke) {
          invokeCallback(pendingValueRef.current);
        }
      }

      // Reset state for next debounce cycle
      pendingValueRef.current = null;
      hasLeadingCalledRef.current = false;
      lastCallTimeRef.current = null;

      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
    }, delay);
  };

  // Attach control functions
  const result = debouncedFn as DebouncedCallback<T>;
  result.cancel = cancel;
  result.flush = flush;
  result.isPending = isPending;

  return result;
}

