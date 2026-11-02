import SwiftUI

struct FeedView: View {
    let posts: [Post]

    var body: some View {
        ScrollView {
            PanelCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Мои Новости")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(FriendsTheme.title)

                    Text("Лента обновлений друзей и сообществ")
                        .font(.system(size: 13))
                        .foregroundStyle(FriendsTheme.muted)
                        .padding(.bottom, 4)

                    ForEach(posts) { post in
                        PostCardView(post: post)
                        if post.id != posts.last?.id {
                            Divider().overlay(FriendsTheme.border)
                        }
                    }
                }
            }
            .padding(14)
        }
        .background(FriendsTheme.bg)
    }
}
