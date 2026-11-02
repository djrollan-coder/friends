import SwiftUI

struct MoreView: View {
    var onLogout: (() -> Void)? = nil

    var body: some View {
        ScrollView {
            PanelCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Ещё")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(FriendsTheme.title)

                    VStack(spacing: 0) {
                        ForEach(MockData.moreLinks, id: \.self) { item in
                            HStack {
                                Text(item)
                                    .foregroundStyle(FriendsTheme.link)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(FriendsTheme.muted)
                            }
                            .font(.system(size: 14))
                            .padding(.vertical, 12)

                            if item != MockData.moreLinks.last {
                                Divider().overlay(FriendsTheme.border)
                            }
                        }
                    }

                    if let onLogout {
                        Divider().overlay(FriendsTheme.border)
                        Button("Выйти") {
                            onLogout()
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color(red: 0.9, green: 0.35, blue: 0.35))
                        .padding(.vertical, 12)
                    }
                }
            }
            .padding(14)
        }
        .background(FriendsTheme.bg)
    }
}
