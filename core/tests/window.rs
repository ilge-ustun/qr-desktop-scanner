//! The popover's collectionBehavior, as raw bits. Each expected value is a
//! literal, not built from the module's constants: a wrong constant would
//! otherwise pass.

use qr_core::window::{
    popover_collection_behavior, CAN_JOIN_ALL_SPACES, FULL_SCREEN_AUXILIARY, FULL_SCREEN_NONE,
    FULL_SCREEN_PRIMARY, MOVE_TO_ACTIVE_SPACE,
};

/// The bits the function sets or clears; every other bit goes through.
const OWN_BITS: [u32; 5] = [0, 1, 7, 8, 9];

/// Each single bit, none, all, and a few mixes.
fn inputs() -> impl Iterator<Item = u64> {
    (0..64).map(|i| 1u64 << i).chain([
        0,
        u64::MAX,
        0x1286,
        0x383,
        0xAAAA_AAAA_AAAA_AAAA,
        0x5555_5555_5555_5555,
    ])
}

#[test]
fn sets_all_spaces_and_full_screen_auxiliary_and_clears_the_rest_of_its_bits() {
    for (current, result) in [
        (0x0, 0x101),
        (0x1, 0x101),
        (0x2, 0x101),
        (0x3, 0x101),
        (0x80, 0x101),
        (0x81, 0x101),
        (0x100, 0x101),
        (0x101, 0x101),
        (0x200, 0x101),
        (0x301, 0x101),
        (0x383, 0x101),
    ] {
        assert_eq!(
            popover_collection_behavior(current),
            result,
            "current {current:#x}"
        );
    }
}

#[test]
fn every_other_bit_comes_out_as_it_went_in() {
    let mut rows: Vec<(u64, u64)> = (0..64)
        .filter(|i| !OWN_BITS.contains(i))
        .map(|i| (1 << i, (1 << i) | 0x101))
        .collect();
    assert_eq!(rows.len(), 59);
    rows.push((u64::MAX, 0xFFFF_FFFF_FFFF_FD7D));
    // Managed, MoveToActiveSpace, FullScreenPrimary, FullScreenNone,
    // FullScreenDisallowsTiling.
    rows.push((0x1286, 0x1105));
    for (current, result) in rows {
        assert_eq!(
            popover_collection_behavior(current),
            result,
            "current {current:#x}"
        );
    }
}

#[test]
fn the_storys_three_single_bit_examples() {
    assert_eq!(popover_collection_behavior(1 << 10), 0x501);
    // FullScreenDisallowsTiling.
    assert_eq!(popover_collection_behavior(1 << 12), 0x1101);
    assert_eq!(popover_collection_behavior(1 << 63), 0x8000_0000_0000_0101);
}

/// AppKit takes at most one of FullScreenPrimary, FullScreenAuxiliary and
/// FullScreenNone, and the popover must keep Auxiliary; and a window on all
/// Spaces has no use for MoveToActiveSpace.
#[test]
fn the_result_holds_auxiliary_alone_and_all_spaces_without_move_to_active_space() {
    for current in inputs() {
        let result = popover_collection_behavior(current);
        assert_eq!(result & 0x380, 0x100, "current {current:#x}");
        assert_eq!(result & 0x3, 0x1, "current {current:#x}");
    }
}

/// Applying the rule to a window that already has it changes nothing.
#[test]
fn applying_it_twice_is_applying_it_once() {
    for current in inputs() {
        let once = popover_collection_behavior(current);
        assert_eq!(
            popover_collection_behavior(once),
            once,
            "current {current:#x}"
        );
    }
}

#[test]
fn the_constants_are_appkits_bits() {
    assert_eq!(CAN_JOIN_ALL_SPACES, 0x1);
    assert_eq!(MOVE_TO_ACTIVE_SPACE, 0x2);
    assert_eq!(FULL_SCREEN_PRIMARY, 0x80);
    assert_eq!(FULL_SCREEN_AUXILIARY, 0x100);
    assert_eq!(FULL_SCREEN_NONE, 0x200);
}
