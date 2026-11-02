import SwiftUI

struct RootView: View {
    @State private var isLoggedIn = false
    @State private var tab: AppTab = .page
    @State private var posts = MockData.initialPosts
    @State private var search = ""

    var body: some View {
        Group {
            if isLoggedIn {
                mainApp
            } else {
                LoginView { _ in
                    isLoggedIn = true
                }
            }
        }
    }

    private var mainApp: some View {
        VStack(spacing: 0) {
            header

            TabView(selection: $tab) {
                MyPageView(posts: $posts)
                    .tag(AppTab.page)

                FeedView(posts: posts)
                    .tag(AppTab.feed)

                FriendsListView()
                    .tag(AppTab.friends)

                MessagesView()
                    .tag(AppTab.messages)

                MoreView(onLogout: { isLoggedIn = false })
                    .tag(AppTab.more)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            tabBar
        }
        .background(FriendsTheme.bg.ignoresSafeArea())
    }

    private var header: some View {
        HStack(spacing: 10) {
            HStack(spacing: 8) {
                Text("F")
                    .font(.system(size: 13, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(
                        LinearGradient(
                            colors: [Color(red: 0.83, green: 0.54, blue: 0.35), FriendsTheme.accent],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))

                Text("Friends")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
            }

            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 13))
                    .foregroundStyle(FriendsTheme.muted)
                TextField("Поиск", text: $search)
                    .foregroundStyle(FriendsTheme.text)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(FriendsTheme.panelAlt)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(FriendsTheme.border, lineWidth: 1)
            )

            if tab == .messages {
                BadgeView(value: 1)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(FriendsTheme.border)
                .frame(height: 1)
        }
    }

    private var tabBar: some View {
        HStack {
            ForEach(AppTab.allCases) { item in
                Button {
                    tab = item
                } label: {
                    VStack(spacing: 4) {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: item.systemImage)
                                .font(.system(size: 18, weight: .semibold))

                            if item == .messages {
                                Circle()
                                    .fill(FriendsTheme.accent)
                                    .frame(width: 7, height: 7)
                                    .offset(x: 6, y: -2)
                            }
                        }
                        Text(item.rawValue)
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(tab == item ? FriendsTheme.accent : FriendsTheme.muted)
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(FriendsTheme.panelAlt.opacity(0.96))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(FriendsTheme.border)
                .frame(height: 1)
        }
    }
}
