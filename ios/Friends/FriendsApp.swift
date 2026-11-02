import SwiftUI

@main
struct FriendsApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
                .tint(FriendsTheme.accent)
        }
    }
}
