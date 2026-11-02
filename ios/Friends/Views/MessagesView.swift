import SwiftUI

struct MessagesView: View {
    private let threads = MockData.messages

    var body: some View {
        ScrollView {
            PanelCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Мои Сообщения")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(FriendsTheme.title)

                    VStack(spacing: 0) {
                        ForEach(threads) { thread in
                            HStack(spacing: 12) {
                                AvatarView(initials: thread.user.initials, size: 48)

                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(thread.user.name)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(FriendsTheme.link)
                                        Spacer()
                                        Text(thread.time)
                                            .font(.system(size: 12))
                                            .foregroundStyle(FriendsTheme.muted)
                                    }

                                    HStack {
                                        Text(thread.preview)
                                            .font(.system(size: 13))
                                            .foregroundStyle(FriendsTheme.text)
                                            .lineLimit(1)
                                        Spacer()
                                        if thread.unread > 0 {
                                            BadgeView(value: thread.unread)
                                        }
                                    }
                                }
                            }
                            .padding(.vertical, 10)

                            if thread.id != threads.last?.id {
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
}
