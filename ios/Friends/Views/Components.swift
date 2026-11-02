import SwiftUI

struct AvatarView: View {
    let initials: String
    var size: CGFloat = 48
    var cornerRadius: CGFloat? = nil

    private var radius: CGFloat {
        cornerRadius ?? size * 0.28
    }

    var body: some View {
        Text(initials)
            .font(.system(size: size * 0.34, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(
                LinearGradient(
                    colors: [Color(red: 0.83, green: 0.54, blue: 0.35), Color(red: 0.54, green: 0.31, blue: 0.18)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(FriendsTheme.border, lineWidth: 1)
            )
    }
}

struct BadgeView: View {
    let value: Int

    var body: some View {
        Text("+\(value)")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(FriendsTheme.danger)
            .clipShape(Capsule())
    }
}

struct SectionTitle: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(FriendsTheme.title)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 6)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(FriendsTheme.border)
                    .frame(height: 1)
            }
    }
}

struct PostCardView: View {
    let post: Post

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AvatarView(initials: post.author.initials, size: 44)

            VStack(alignment: .leading, spacing: 6) {
                Text(post.author.name)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(FriendsTheme.link)

                Text(post.createdAt)
                    .font(.system(size: 12))
                    .foregroundStyle(FriendsTheme.muted)

                Text(post.text)
                    .font(.system(size: 14))
                    .foregroundStyle(FriendsTheme.text)
                    .fixedSize(horizontal: false, vertical: true)

                if let attachment = post.attachment {
                    HStack(spacing: 10) {
                        Text("ZIP")
                            .font(.system(size: 10, weight: .heavy))
                            .foregroundStyle(Color(red: 0.02, green: 0.08, blue: 0.05))
                            .frame(width: 30, height: 34)
                            .background(FriendsTheme.online)
                            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(attachment.name)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(FriendsTheme.link)
                            Text(attachment.size)
                                .font(.system(size: 11))
                                .foregroundStyle(FriendsTheme.muted)
                        }
                    }
                    .padding(10)
                    .background(FriendsTheme.panelAlt)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(FriendsTheme.border, lineWidth: 1)
                    )
                }

                HStack(spacing: 14) {
                    action("Мне нравится", post.likes)
                    action("Коммент.", post.comments)
                    action("Поделиться", post.reposts)
                }
                .padding(.top, 2)
            }
        }
        .padding(.vertical, 10)
    }

    private func action(_ title: String, _ count: Int) -> some View {
        Text("\(title) (\(count))")
            .font(.system(size: 12))
            .foregroundStyle(FriendsTheme.link)
    }
}

struct PanelCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(FriendsTheme.panel)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(FriendsTheme.border, lineWidth: 1)
            )
    }
}
