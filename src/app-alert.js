export function isAppInBackground(documentLike) {
  return documentLike.hidden || !documentLike.hasFocus();
}

export function updateAppBadge(navigatorLike, count) {
  try {
    const operation = count > 0
      ? navigatorLike.setAppBadge?.(count)
      : navigatorLike.clearAppBadge?.();
    operation?.catch(() => {});
  } catch {
    // Badging support is optional and must not interrupt the countdown alert.
  }
}
