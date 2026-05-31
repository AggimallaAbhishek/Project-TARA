let activeSuccessHandler = null;
let activeErrorHandler = null;

function debugCallbackRegistry(eventName) {
  if (!import.meta.env.DEV) {
    return;
  }
  console.debug(eventName);
}

export function registerGoogleLoginCallbacks({ onSuccess, onError }) {
  activeSuccessHandler = typeof onSuccess === 'function' ? onSuccess : null;
  activeErrorHandler = typeof onError === 'function' ? onError : null;
  debugCallbackRegistry('auth.google_callbacks.registered');
}

export function clearGoogleLoginCallbacks() {
  activeSuccessHandler = null;
  activeErrorHandler = null;
  debugCallbackRegistry('auth.google_callbacks.cleared');
}

export async function dispatchGoogleLoginSuccess(payload) {
  if (typeof activeSuccessHandler !== 'function') {
    debugCallbackRegistry('auth.google_callbacks.success_skipped');
    return;
  }
  debugCallbackRegistry('auth.google_callbacks.success_dispatched');
  await activeSuccessHandler(payload);
}

export function dispatchGoogleLoginError() {
  if (typeof activeErrorHandler !== 'function') {
    debugCallbackRegistry('auth.google_callbacks.error_skipped');
    return;
  }
  debugCallbackRegistry('auth.google_callbacks.error_dispatched');
  activeErrorHandler();
}
