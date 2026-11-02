import SwiftUI

struct MyPageView: View {
    @Binding var posts: [Post]
    private let user = MockData.currentUser
    private let friends = MockData.friends

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                PanelCard {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack(alignment: .top, spacing: 14) {
                            AvatarView(initials: user.initials, size: 96, cornerRadius: 18)

                            VStack(alignment: .leading, spacing: 8) {
                                Text(user.name)
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundStyle(FriendsTheme.title)

                                Text(user.status ?? "")
                                    .font(.system(size: 13))
                                    .foregroundStyle(FriendsTheme.muted)

                                HStack(spacing: 16) {
                                    stat("\(friends.count)", "друзей")
                                    stat("24", "фото")
                                    stat("7", "групп")
                                }
                                .padding(.top, 4)
                            }
                        }

                        VStack(spacing: 0) {
                            sideAction("Написать сообщение")
                            sideAction("Редактировать страницу")
                        }
                        .background(FriendsTheme.panelAlt)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(FriendsTheme.border, lineWidth: 1)
                        )

                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(MockData.profileInfo, id: \.0) { row in
                                HStack(alignment: .top) {
                                    Text(row.0)
                                        .foregroundStyle(FriendsTheme.muted)
                                        .frame(width: 140, alignment: .leading)
                                    Text(row.1)
                                        .foregroundStyle(FriendsTheme.link)
                                }
                                .font(.system(size: 13))
                            }
                        }

                        SectionTitle(title: "Друзья \(friends.count)")

                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 4), spacing: 10) {
                            ForEach(friends.prefix(8)) { friend in
                                VStack(spacing: 6) {
                                    AvatarView(initials: friend.initials, size: 64)
                                    Text(friend.name.split(separator: " ").first.map(String.init) ?? friend.name)
                                        .font(.system(size: 11))
                                        .foregroundStyle(FriendsTheme.link)
                                        .lineLimit(1)
                                }
                            }
                        }
                    }
                }

                PanelCard {
                    WallView(posts: $posts)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
        .background(FriendsTheme.bg)
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(FriendsTheme.title)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(FriendsTheme.muted)
        }
    }

    private func sideAction(_ title: String) -> some View {
        Button(title) {}
            .font(.system(size: 13))
            .foregroundStyle(FriendsTheme.link)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
    }
}
