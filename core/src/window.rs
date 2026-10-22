//! How the popover window joins Spaces, as the raw bits of AppKit's
//! `NSWindowCollectionBehavior`. The shell reads the window's bits, passes
//! them through [`popover_collection_behavior`] and writes the result back.

/// `NSWindowCollectionBehaviorCanJoinAllSpaces`.
pub const CAN_JOIN_ALL_SPACES: u64 = 1 << 0;
/// `NSWindowCollectionBehaviorMoveToActiveSpace`.
pub const MOVE_TO_ACTIVE_SPACE: u64 = 1 << 1;
/// `NSWindowCollectionBehaviorFullScreenPrimary`.
pub const FULL_SCREEN_PRIMARY: u64 = 1 << 7;
/// `NSWindowCollectionBehaviorFullScreenAuxiliary`.
pub const FULL_SCREEN_AUXILIARY: u64 = 1 << 8;
/// `NSWindowCollectionBehaviorFullScreenNone`.
pub const FULL_SCREEN_NONE: u64 = 1 << 9;

/// The bits the popover needs, from the window's `collectionBehavior` now.
/// It is on every Space and in another app's full-screen Space too
/// (FullScreenAuxiliary). AppKit takes at most one of the three full-screen
/// bits, so Primary and None go; a window on every Space has no use for
/// MoveToActiveSpace. Every other bit stays as it is.
pub fn popover_collection_behavior(current: u64) -> u64 {
    let cleared = current & !(MOVE_TO_ACTIVE_SPACE | FULL_SCREEN_PRIMARY | FULL_SCREEN_NONE);
    cleared | CAN_JOIN_ALL_SPACES | FULL_SCREEN_AUXILIARY
}
