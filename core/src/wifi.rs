//! Joining a Wi-Fi network from a scanned code. The network name and password
//! come from the code, so they are checked before they reach the OS.

use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum WifiError {
    #[error("the network name is empty")]
    EmptyName,
    #[error("the network name is longer than 32 bytes")]
    NameTooLong,
    #[error("the password is longer than 64 characters")]
    PasswordTooLong,
    #[error("the network name or password contains control characters")]
    ControlCharacters,
}

/// The limits of 802.11: an SSID is at most 32 bytes, a WPA passphrase at
/// most 63 characters (64 as a hex key).
pub fn validate(ssid: &str, password: Option<&str>) -> Result<(), WifiError> {
    if ssid.is_empty() {
        return Err(WifiError::EmptyName);
    }
    if ssid.len() > 32 {
        return Err(WifiError::NameTooLong);
    }
    if password.is_some_and(|p| p.chars().count() > 64) {
        return Err(WifiError::PasswordTooLong);
    }
    if ssid
        .chars()
        .chain(password.unwrap_or("").chars())
        .any(char::is_control)
    {
        return Err(WifiError::ControlCharacters);
    }
    Ok(())
}

/// The Wi-Fi interface (`en0` on most Macs) in the output of
/// `networksetup -listallhardwareports`.
pub fn wifi_device(listing: &str) -> Option<String> {
    let mut lines = listing.lines().map(str::trim);
    while let Some(line) = lines.next() {
        let port = line.strip_prefix("Hardware Port:").map(str::trim);
        // "AirPort" is what macOS called it before 10.7.
        if matches!(port, Some("Wi-Fi" | "AirPort")) {
            return lines
                .next()
                .and_then(|l| l.strip_prefix("Device:"))
                .map(|d| d.trim().to_owned())
                .filter(|d| !d.is_empty());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ordinary_networks_pass() {
        assert_eq!(validate("Home", Some("correct horse")), Ok(()));
        assert_eq!(validate("Café Wi-Fi", None), Ok(()));
        assert_eq!(validate(&"a".repeat(32), Some(&"p".repeat(64))), Ok(()));
    }

    #[test]
    fn out_of_spec_input_is_refused() {
        assert_eq!(validate("", None), Err(WifiError::EmptyName));
        assert_eq!(validate(&"a".repeat(33), None), Err(WifiError::NameTooLong));
        // 11 x 3 bytes: 11 characters, but over 32 bytes.
        assert_eq!(validate(&"€".repeat(11), None), Err(WifiError::NameTooLong));
        assert_eq!(
            validate("Home", Some(&"p".repeat(65))),
            Err(WifiError::PasswordTooLong)
        );
        assert_eq!(validate("Home\n", None), Err(WifiError::ControlCharacters));
        assert_eq!(
            validate("Home", Some("a\0b")),
            Err(WifiError::ControlCharacters)
        );
    }

    const LISTING: &str = "\
Hardware Port: Thunderbolt Bridge
Device: bridge0
Ethernet Address: N/A

Hardware Port: Wi-Fi
Device: en0
Ethernet Address: aa:bb:cc:dd:ee:ff

VLAN Configurations
===================
";

    #[test]
    fn the_wifi_device_is_found_in_the_port_listing() {
        assert_eq!(wifi_device(LISTING), Some("en0".into()));
        assert_eq!(
            wifi_device("Hardware Port: AirPort\nDevice: en1\n"),
            Some("en1".into())
        );
    }

    #[test]
    fn a_mac_without_wifi_has_no_device() {
        assert_eq!(wifi_device("Hardware Port: Ethernet\nDevice: en0\n"), None);
        assert_eq!(wifi_device(""), None);
    }
}
