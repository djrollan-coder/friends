import SwiftUI

enum FriendsTheme {
    // Industrial turbine / glass — copper accent, no blue
    static let bg = Color(red: 0.08, green: 0.09, blue: 0.10)
    static let panel = Color(red: 0.14, green: 0.15, blue: 0.16).opacity(0.72)
    static let panelAlt = Color(red: 0.18, green: 0.18, blue: 0.19).opacity(0.55)
    static let border = Color.white.opacity(0.14)
    static let text = Color(red: 0.94, green: 0.94, blue: 0.95)
    static let muted = Color(red: 0.70, green: 0.70, blue: 0.72)
    static let link = Color(red: 0.77, green: 0.47, blue: 0.29)      // #C4784A
    static let accent = Color(red: 0.77, green: 0.47, blue: 0.29)
    static let online = Color(red: 0.77, green: 0.47, blue: 0.29)
    static let title = Color.white
    static let onAccent = Color.white
    static let danger = Color(red: 0.79, green: 0.29, blue: 0.29)
}
