import Foundation

struct User: Identifiable, Hashable {
    let id: String
    let name: String
    let initials: String
    var status: String? = nil
    var online: Bool = false
}

struct Post: Identifiable, Hashable {
    let id: String
    let author: User
    var text: String
    let createdAt: String
    var likes: Int
    var comments: Int
    var reposts: Int
    var attachment: Attachment? = nil
}

struct Attachment: Hashable {
    let name: String
    let size: String
}

struct MessageThread: Identifiable, Hashable {
    let id: String
    let user: User
    let preview: String
    let time: String
    var unread: Int = 0
}

enum AppTab: String, CaseIterable, Identifiable {
    case page = "Страница"
    case feed = "Новости"
    case friends = "Друзья"
    case messages = "Сообщения"
    case more = "Ещё"

    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .page: return "person.crop.circle"
        case .feed: return "newspaper"
        case .friends: return "person.2"
        case .messages: return "bubble.left.and.bubble.right"
        case .more: return "ellipsis.circle"
        }
    }
}
