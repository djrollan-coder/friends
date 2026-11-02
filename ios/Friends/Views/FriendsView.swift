import SwiftUI

struct FriendsListView: View {
    private let friends = MockData.friends

    var body: some View {
        ScrollView {
            PanelCard {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Мои Друзья")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(FriendsTheme.title)

                    HStack(spacing: 18) {
                        labeledCount("\(friends.count)", "всего")
                        labeledCount("\(MockData.onlineFriends.count)", "на сайте")
                    }

                    VStack(spacing: 0) {
                        ForEach(friends) { friend in
                            HStack(spacing: 12) {
                                ZStack(alignment: .bottomTrailing) {
                                    AvatarView(initials: friend.initials, size: 48)
                                    if friend.online {
                                        Circle()
                                            .fill(FriendsTheme.online)
                                            .frame(width: 10, height: 10)
                                            .overlay(Circle().stroke(FriendsTheme.panel, lineWidth: 2))
                                            .offset(x: 1, y: 1)
                                    }
                                }

                                VStack(alignment: .leading, spacing: 3) {
                                    Text(friend.name)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(FriendsTheme.link)
                                    Text(friend.online ? "сейчас на сайте" : "был(а) недавно")
                                        .font(.system(size: 12))
                                        .foregroundStyle(FriendsTheme.muted)
                                }

                                Spacer()

                                Text("Написать")
                                    .font(.system(size: 12))
                                    .foregroundStyle(FriendsTheme.link)
                            }
                            .padding(.vertical, 10)

                            if friend.id != friends.last?.id {
                                Divider().overlay(FriendsTheme.border)
                            }
                        }
                    }
                }
            }
            .padding(14)
        }
        .background(FriendsTheme.bg)
    }

    private func labeledCount(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(FriendsTheme.title)
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(FriendsTheme.muted)
        }
    }
}
