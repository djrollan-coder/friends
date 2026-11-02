import Foundation

enum MockData {
    static let currentUser = User(
        id: "1",
        name: "Роман Моторный",
        initials: "РМ",
        status: "Строим соцсеть",
        online: true
    )

    static let friends: [User] = [
        User(id: "2", name: "Анна Ковалёва", initials: "АК", online: true),
        User(id: "3", name: "Игорь Смирнов", initials: "ИС", online: true),
        User(id: "4", name: "Мария Петрова", initials: "МП", online: false),
        User(id: "5", name: "Дмитрий Орлов", initials: "ДО", online: true),
        User(id: "6", name: "Елена Васильева", initials: "ЕВ", online: false),
        User(id: "7", name: "Павел Кузнецов", initials: "ПК", online: true),
        User(id: "8", name: "Ольга Новикова", initials: "ОН", online: true),
        User(id: "9", name: "Сергей Волков", initials: "СВ", online: false),
    ]

    static var onlineFriends: [User] {
        friends.filter(\.online)
    }

    static let profileInfo: [(String, String)] = [
        ("День рождения", "1 ноября"),
        ("Город", "Москва"),
        ("Семейное положение", "в активном поиске"),
    ]

    static let initialPosts: [Post] = [
        Post(
            id: "p1",
            author: currentUser,
            text: "Запускаем первую версию Friends. Стена, друзья, сообщения — всё на месте.",
            createdAt: "сегодня в 19:05",
            likes: 12,
            comments: 3,
            reposts: 1
        ),
        Post(
            id: "p2",
            author: User(id: "g1", name: "Friends News", initials: "FN"),
            text: "Обновление 0.608\n— тёмная тема и современные цвета\n— iOS-приложение\n— обновлён интерфейс ленты",
            createdAt: "сегодня в 18:40",
            likes: 248,
            comments: 41,
            reposts: 17,
            attachment: Attachment(name: "0.608.zip", size: "370 КБ")
        ),
        Post(
            id: "p3",
            author: friends[0],
            text: "Friends уже похож на нормальную соцсеть — слева меню, справа друзья онлайн.",
            createdAt: "вчера в 21:40",
            likes: 56,
            comments: 8,
            reposts: 2
        ),
    ]

    static let messages: [MessageThread] = [
        MessageThread(
            id: "m1",
            user: friends[0],
            preview: "Привет! Когда покажешь прототип?",
            time: "18:41",
            unread: 1
        ),
        MessageThread(
            id: "m2",
            user: friends[1],
            preview: "Скинь ссылку на стену",
            time: "17:12"
        ),
        MessageThread(
            id: "m3",
            user: friends[4],
            preview: "Friends смотрится круто 🔥",
            time: "вчера"
        ),
    ]

    static let moreLinks = [
        "Фотографии",
        "Видеозаписи",
        "Аудиозаписи",
        "Группы",
        "Ответы",
        "Закладки",
        "Настройки",
        "Приложения",
        "Документы",
    ]
}
