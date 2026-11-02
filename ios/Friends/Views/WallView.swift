import SwiftUI

struct WallView: View {
    @Binding var posts: [Post]
    @State private var draft = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(title: "Стена")

            VStack(alignment: .trailing, spacing: 8) {
                TextField("Что у Вас нового? (⇧Enter — отправить)", text: $draft, axis: .vertical)
                    .lineLimit(3...6)
                    .padding(10)
                    .background(FriendsTheme.panelAlt)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(FriendsTheme.border, lineWidth: 1)
                    )
                    .foregroundStyle(FriendsTheme.text)
                    .onKeyPress { keyPress in
                        if keyPress.key == .return && keyPress.modifiers.contains(.shift) {
                            publish()
                            return .handled
                        }
                        return .ignored
                    }

                HStack {
                    Text("Shift+Enter")
                        .font(.system(size: 11))
                        .foregroundStyle(FriendsTheme.muted)
                    Spacer()
                    Button(action: publish) {
                        Text("Отправить")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? FriendsTheme.accent.opacity(0.4) : FriendsTheme.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .padding(10)
            .background(FriendsTheme.panelAlt)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(FriendsTheme.border, lineWidth: 1)
            )

            ForEach(posts) { post in
                PostCardView(post: post)
                if post.id != posts.last?.id {
                    Divider().overlay(FriendsTheme.border)
                }
            }
        }
    }

    private func publish() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        let post = Post(
            id: "local-\(UUID().uuidString)",
            author: MockData.currentUser,
            text: text,
            createdAt: "только что",
            likes: 0,
            comments: 0,
            reposts: 0
        )
        posts.insert(post, at: 0)
        draft = ""
    }
}
