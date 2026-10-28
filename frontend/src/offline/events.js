// Window events shared by the data layer and the UI.
export const SESSION_EXPIRED_EVENT = "auth:expired";
export const DATA_CHANGED_EVENT = "herd:changed";
/** Fired after queued changes have been uploaded and the local copy refreshed. */
export const SYNC_COMPLETE_EVENT = "herd:synced";
