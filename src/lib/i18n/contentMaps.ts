import type { Locale } from "./types";

type L10n = Partial<Record<Locale, string>> & { en: string };

function pick(map: L10n, locale: Locale, fallback: string) {
  if (locale === "ru") return fallback;
  return map[locale] ?? map.en ?? fallback;
}

const albums: Record<string, L10n> = {
  a1: {
    en: "Page photos",
    uk: "Фото зі сторінки",
    es: "Fotos de la página",
    de: "Seitenfotos",
    fr: "Photos de la page",
  },
  a2: {
    en: "Wall photos",
    uk: "Фото на стіні",
    es: "Fotos del muro",
    de: "Pinnwand-Fotos",
    fr: "Photos du mur",
  },
  a3: {
    en: "Saved photos",
    uk: "Збережені фото",
    es: "Fotos guardadas",
    de: "Gespeicherte Fotos",
    fr: "Photos enregistrées",
  },
  a4: {
    en: "Photos with me",
    uk: "Фото зі мною",
    es: "Fotos conmigo",
    de: "Fotos mit mir",
    fr: "Photos avec moi",
  },
  a5: {
    en: "My photos",
    uk: "Мої фотографії",
    es: "Mis fotos",
    de: "Meine Fotos",
    fr: "Mes photos",
  },
};

const photoTitles: Record<string, L10n> = {
  "Вечер на крыше": {
    en: "Evening on the roof",
    uk: "Вечір на даху",
    es: "Noche en la azotea",
    de: "Abend auf dem Dach",
    fr: "Soirée sur le toit",
  },
  "Кофе в центре": {
    en: "Coffee downtown",
    uk: "Кава в центрі",
    es: "Café en el centro",
    de: "Kaffee in der City",
    fr: "Café en centre-ville",
  },
  "Друзья у озера": {
    en: "Friends by the lake",
    uk: "Друзі біля озера",
    es: "Amigos junto al lago",
    de: "Freunde am See",
    fr: "Amis au lac",
  },
  "Рабочий стол": {
    en: "Desk setup",
    uk: "Робочий стіл",
    es: "Escritorio",
    de: "Schreibtisch",
    fr: "Bureau",
  },
  "Закат на МКАД": {
    en: "Sunset on the beltway",
    uk: "Захід на кільцевій",
    es: "Atardecer en la circunvalación",
    de: "Sonnenuntergang am Ring",
    fr: "Coucher de soleil sur le périphérique",
  },
  "Кухня в субботу": {
    en: "Saturday kitchen",
    uk: "Кухня в суботу",
    es: "Cocina del sábado",
    de: "Küche am Samstag",
    fr: "Cuisine du samedi",
  },
  "Концерт в клубе": {
    en: "Club concert",
    uk: "Концерт у клубі",
    es: "Concierto en el club",
    de: "Konzert im Club",
    fr: "Concert au club",
  },
  "Утренний парк": {
    en: "Morning park",
    uk: "Ранковий парк",
    es: "Parque por la mañana",
    de: "Park am Morgen",
    fr: "Parc du matin",
  },
  "Домашний кот": {
    en: "House cat",
    uk: "Домашній кіт",
    es: "Gato de casa",
    de: "Hauskatze",
    fr: "Chat de maison",
  },
  "Поезд в Питер": {
    en: "Train to Petersburg",
    uk: "Поїзд до Пітера",
    es: "Tren a Petersburgo",
    de: "Zug nach Petersburg",
    fr: "Train pour Saint-Pétersbourg",
  },
  "Новый плеер": {
    en: "New player",
    uk: "Новий плеєр",
    es: "Nuevo reproductor",
    de: "Neuer Player",
    fr: "Nouveau lecteur",
  },
  "Съёмка профиля": {
    en: "Profile shoot",
    uk: "Зйомка профілю",
    es: "Sesión de perfil",
    de: "Profilshooting",
    fr: "Shooting profil",
  },
  "Встреча команды": {
    en: "Team meetup",
    uk: "Зустріч команди",
    es: "Reunión del equipo",
    de: "Teamtreffen",
    fr: "Réunion d’équipe",
  },
  "Окно после дождя": {
    en: "Window after rain",
    uk: "Вікно після дощу",
    es: "Ventana tras la lluvia",
    de: "Fenster nach dem Regen",
    fr: "Fenêtre après la pluie",
  },
  "Плейлист ночью": {
    en: "Night playlist",
    uk: "Плейлист уночі",
    es: "Playlist nocturna",
    de: "Nacht-Playlist",
    fr: "Playlist de nuit",
  },
  "Семейный ужин": {
    en: "Family dinner",
    uk: "Сімейна вечеря",
    es: "Cena familiar",
    de: "Familienabendessen",
    fr: "Dîner en famille",
  },
  "Прогулка вдвоём": {
    en: "Walk for two",
    uk: "Прогулянка вдвох",
    es: "Paseo de dos",
    de: "Spaziergang zu zweit",
    fr: "Promenade à deux",
  },
  "Старый двор": {
    en: "Old courtyard",
    uk: "Старий двір",
    es: "Viejo patio",
    de: "Alter Hof",
    fr: "Vieille cour",
  },
  "Лампы на кухне": {
    en: "Kitchen lamps",
    uk: "Лампи на кухні",
    es: "Lámparas de cocina",
    de: "Lampen in der Küche",
    fr: "Lampes de cuisine",
  },
  "Мост и туман": {
    en: "Bridge and fog",
    uk: "Міст і туман",
    es: "Puente y niebla",
    de: "Brücke und Nebel",
    fr: "Pont et brouillard",
  },
  "Кадр с балкона": {
    en: "Balcony shot",
    uk: "Кадр з балкону",
    es: "Toma del balcón",
    de: "Balkonaufnahme",
    fr: "Prise du balcon",
  },
  "Архив 2024": {
    en: "Archive 2024",
    uk: "Архів 2024",
    es: "Archivo 2024",
    de: "Archiv 2024",
    fr: "Archives 2024",
  },
  "Любимое место": {
    en: "Favorite place",
    uk: "Улюблене місце",
    es: "Lugar favorito",
    de: "Lieblingsort",
    fr: "Endroit préféré",
  },
  "Случайный портрет": {
    en: "Random portrait",
    uk: "Випадковий портрет",
    es: "Retrato al azar",
    de: "Zufälliges Porträt",
    fr: "Portrait au hasard",
  },
};

const months: Record<string, L10n> = {
  янв: { en: "Jan", uk: "січ", es: "ene", de: "Jan", fr: "janv." },
  фев: { en: "Feb", uk: "лют", es: "feb", de: "Feb", fr: "févr." },
  мар: { en: "Mar", uk: "бер", es: "mar", de: "Mär", fr: "mars" },
  апр: { en: "Apr", uk: "кві", es: "abr", de: "Apr", fr: "avr." },
  мая: { en: "May", uk: "тра", es: "may", de: "Mai", fr: "mai" },
  май: { en: "May", uk: "тра", es: "may", de: "Mai", fr: "mai" },
  июн: { en: "Jun", uk: "чер", es: "jun", de: "Jun", fr: "juin" },
  июл: { en: "Jul", uk: "лип", es: "jul", de: "Jul", fr: "juil." },
  авг: { en: "Aug", uk: "сер", es: "ago", de: "Aug", fr: "août" },
  сен: { en: "Sep", uk: "вер", es: "sep", de: "Sep", fr: "sept." },
  окт: { en: "Oct", uk: "жов", es: "oct", de: "Okt", fr: "oct." },
  ноя: { en: "Nov", uk: "лис", es: "nov", de: "Nov", fr: "nov." },
  дек: { en: "Dec", uk: "гру", es: "dic", de: "Dez", fr: "déc." },
};

const interests: Record<string, L10n> = {
  "Технологии": { en: "Technology", uk: "Технології", es: "Tecnología", de: "Technologie", fr: "Technologie" },
  "Программирование": { en: "Programming", uk: "Програмування", es: "Programación", de: "Programmierung", fr: "Programmation" },
  "Искусственный интеллект": { en: "Artificial intelligence", uk: "Artificial intelligence", es: "Artificial intelligence", de: "Artificial intelligence", fr: "Artificial intelligence" },
  "Гаджеты": { en: "Gadgets", uk: "Gadgets", es: "Gadgets", de: "Gadgets", fr: "Gadgets" },
  "Стартапы": { en: "Startups", uk: "Startups", es: "Startups", de: "Startups", fr: "Startups" },
  "Кибербезопасность": { en: "Cybersecurity", uk: "Cybersecurity", es: "Cybersecurity", de: "Cybersecurity", fr: "Cybersecurity" },
  "Криптовалюты": { en: "Crypto", uk: "Crypto", es: "Crypto", de: "Crypto", fr: "Crypto" },
  "Open Source": { en: "Open Source", uk: "Open Source", es: "Open Source", de: "Open Source", fr: "Open Source" },
  "Мобильная разработка": { en: "Mobile development", uk: "Mobile development", es: "Mobile development", de: "Mobile development", fr: "Mobile development" },
  "Веб-дизайн": { en: "Web design", uk: "Web design", es: "Web design", de: "Web design", fr: "Web design" },
  "Дизайн": { en: "Design", uk: "Дизайн", es: "Diseño", de: "Design", fr: "Design" },
  "UI/UX": { en: "UI/UX", uk: "UI/UX", es: "UI/UX", de: "UI/UX", fr: "UI/UX" },
  "Фотография": { en: "Photography", uk: "Фотографія", es: "Fotografía", de: "Fotografie", fr: "Photographie" },
  "Видеосъёмка": { en: "Videography", uk: "Videography", es: "Videography", de: "Videography", fr: "Videography" },
  "Иллюстрация": { en: "Illustration", uk: "Illustration", es: "Illustration", de: "Illustration", fr: "Illustration" },
  "Архитектура": { en: "Architecture", uk: "Architecture", es: "Architecture", de: "Architecture", fr: "Architecture" },
  "Мода": { en: "Fashion", uk: "Fashion", es: "Fashion", de: "Fashion", fr: "Fashion" },
  "Интерьер": { en: "Interior", uk: "Interior", es: "Interior", de: "Interior", fr: "Interior" },
  "3D и CGI": { en: "3D & CGI", uk: "3D & CGI", es: "3D & CGI", de: "3D & CGI", fr: "3D & CGI" },
  "Анимация": { en: "Animation", uk: "Animation", es: "Animation", de: "Animation", fr: "Animation" },
  "Музыка": { en: "Music", uk: "Музика", es: "Música", de: "Musik", fr: "Musique" },
  "Инди": { en: "Indie", uk: "Indie", es: "Indie", de: "Indie", fr: "Indie" },
  "Электронная музыка": { en: "Electronic music", uk: "Electronic music", es: "Electronic music", de: "Electronic music", fr: "Electronic music" },
  "Хип-хоп": { en: "Hip-hop", uk: "Hip-hop", es: "Hip-hop", de: "Hip-hop", fr: "Hip-hop" },
  "Рок": { en: "Rock", uk: "Rock", es: "Rock", de: "Rock", fr: "Rock" },
  "Джаз": { en: "Jazz", uk: "Jazz", es: "Jazz", de: "Jazz", fr: "Jazz" },
  "Классическая музыка": { en: "Classical music", uk: "Classical music", es: "Classical music", de: "Classical music", fr: "Classical music" },
  "Поп": { en: "Pop", uk: "Pop", es: "Pop", de: "Pop", fr: "Pop" },
  "Концерты": { en: "Concerts", uk: "Concerts", es: "Concerts", de: "Concerts", fr: "Concerts" },
  "Плейлисты": { en: "Playlists", uk: "Playlists", es: "Playlists", de: "Playlists", fr: "Playlists" },
  "Кино": { en: "Movies", uk: "Кіно", es: "Cine", de: "Filme", fr: "Cinéma" },
  "Сериалы": { en: "TV shows", uk: "TV shows", es: "TV shows", de: "TV shows", fr: "TV shows" },
  "Аниме": { en: "Anime", uk: "Anime", es: "Anime", de: "Anime", fr: "Anime" },
  "Документалистика": { en: "Documentaries", uk: "Documentaries", es: "Documentaries", de: "Documentaries", fr: "Documentaries" },
  "Короткий метр": { en: "Short films", uk: "Short films", es: "Short films", de: "Short films", fr: "Short films" },
  "Фестивали": { en: "Festivals", uk: "Festivals", es: "Festivals", de: "Festivals", fr: "Festivals" },
  "Нетфликс и стриминг": { en: "Netflix & streaming", uk: "Netflix & streaming", es: "Netflix & streaming", de: "Netflix & streaming", fr: "Netflix & streaming" },
  "Игры": { en: "Games", uk: "Ігри", es: "Juegos", de: "Spiele", fr: "Jeux" },
  "Киберспорт": { en: "Esports", uk: "Esports", es: "Esports", de: "Esports", fr: "Esports" },
  "Инди-игры": { en: "Indie games", uk: "Indie games", es: "Indie games", de: "Indie games", fr: "Indie games" },
  "ПК-игры": { en: "PC games", uk: "PC games", es: "PC games", de: "PC games", fr: "PC games" },
  "Консоли": { en: "Consoles", uk: "Consoles", es: "Consoles", de: "Consoles", fr: "Consoles" },
  "Мобильные игры": { en: "Mobile games", uk: "Mobile games", es: "Mobile games", de: "Mobile games", fr: "Mobile games" },
  "Ретро-игры": { en: "Retro games", uk: "Retro games", es: "Retro games", de: "Retro games", fr: "Retro games" },
  "Спорт": { en: "Sports", uk: "Спорт", es: "Deporte", de: "Sport", fr: "Sport" },
  "Футбол": { en: "Football", uk: "Football", es: "Football", de: "Football", fr: "Football" },
  "Баскетбол": { en: "Basketball", uk: "Basketball", es: "Basketball", de: "Basketball", fr: "Basketball" },
  "Хоккей": { en: "Hockey", uk: "Hockey", es: "Hockey", de: "Hockey", fr: "Hockey" },
  "Формула-1": { en: "Formula 1", uk: "Formula 1", es: "Formula 1", de: "Formula 1", fr: "Formula 1" },
  "Теннис": { en: "Tennis", uk: "Tennis", es: "Tennis", de: "Tennis", fr: "Tennis" },
  "Фитнес": { en: "Fitness", uk: "Fitness", es: "Fitness", de: "Fitness", fr: "Fitness" },
  "Бег": { en: "Running", uk: "Running", es: "Running", de: "Running", fr: "Running" },
  "Йога": { en: "Yoga", uk: "Yoga", es: "Yoga", de: "Yoga", fr: "Yoga" },
  "Единоборства": { en: "Martial arts", uk: "Martial arts", es: "Martial arts", de: "Martial arts", fr: "Martial arts" },
  "Наука": { en: "Science", uk: "Наука", es: "Ciencia", de: "Wissenschaft", fr: "Science" },
  "Космос": { en: "Space", uk: "Space", es: "Space", de: "Space", fr: "Space" },
  "Биология": { en: "Biology", uk: "Biology", es: "Biology", de: "Biology", fr: "Biology" },
  "Физика": { en: "Physics", uk: "Physics", es: "Physics", de: "Physics", fr: "Physics" },
  "Психология": { en: "Psychology", uk: "Psychology", es: "Psychology", de: "Psychology", fr: "Psychology" },
  "История": { en: "History", uk: "History", es: "History", de: "History", fr: "History" },
  "Образование": { en: "Education", uk: "Education", es: "Education", de: "Education", fr: "Education" },
  "Языки": { en: "Languages", uk: "Languages", es: "Languages", de: "Languages", fr: "Languages" },
  "Книги": { en: "Books", uk: "Книги", es: "Libros", de: "Bücher", fr: "Livres" },
  "Подкасты": { en: "Podcasts", uk: "Podcasts", es: "Podcasts", de: "Podcasts", fr: "Podcasts" },
  "Новости": { en: "News", uk: "Новини", es: "Noticias", de: "Nachrichten", fr: "Actualités" },
  "Политика": { en: "Politics", uk: "Politics", es: "Politics", de: "Politics", fr: "Politics" },
  "Экономика": { en: "Economy", uk: "Economy", es: "Economy", de: "Economy", fr: "Economy" },
  "Бизнес": { en: "Business", uk: "Business", es: "Business", de: "Business", fr: "Business" },
  "Маркетинг": { en: "Marketing", uk: "Marketing", es: "Marketing", de: "Marketing", fr: "Marketing" },
  "Мемы": { en: "Memes", uk: "Memes", es: "Memes", de: "Memes", fr: "Memes" },
  "Блоги": { en: "Blogs", uk: "Blogs", es: "Blogs", de: "Blogs", fr: "Blogs" },
  "Подкасты о жизни": { en: "Life podcasts", uk: "Life podcasts", es: "Life podcasts", de: "Life podcasts", fr: "Life podcasts" },
  "Путешествия": { en: "Travel", uk: "Подорожі", es: "Viajes", de: "Reisen", fr: "Voyages" },
  "Еда": { en: "Food", uk: "Їжа", es: "Comida", de: "Essen", fr: "Cuisine" },
  "Рецепты": { en: "Recipes", uk: "Recipes", es: "Recipes", de: "Recipes", fr: "Recipes" },
  "Кофе": { en: "Coffee", uk: "Coffee", es: "Coffee", de: "Coffee", fr: "Coffee" },
  "Вино": { en: "Wine", uk: "Wine", es: "Wine", de: "Wine", fr: "Wine" },
  "Здоровье": { en: "Health", uk: "Health", es: "Health", de: "Health", fr: "Health" },
  "Медитация": { en: "Meditation", uk: "Meditation", es: "Meditation", de: "Meditation", fr: "Meditation" },
  "Сон и отдых": { en: "Sleep & rest", uk: "Sleep & rest", es: "Sleep & rest", de: "Sleep & rest", fr: "Sleep & rest" },
  "Минимализм": { en: "Minimalism", uk: "Minimalism", es: "Minimalism", de: "Minimalism", fr: "Minimalism" },
  "Саморазвитие": { en: "Self-growth", uk: "Self-growth", es: "Self-growth", de: "Self-growth", fr: "Self-growth" },
  "Москва": { en: "Moscow", uk: "Москва", es: "Moscú", de: "Moskau", fr: "Moscou" },
  "Санкт-Петербург": { en: "Saint Petersburg", uk: "Saint Petersburg", es: "Saint Petersburg", de: "Saint Petersburg", fr: "Saint Petersburg" },
  "Городская жизнь": { en: "City life", uk: "City life", es: "City life", de: "City life", fr: "City life" },
  "Выставки": { en: "Exhibitions", uk: "Exhibitions", es: "Exhibitions", de: "Exhibitions", fr: "Exhibitions" },
  "Театр": { en: "Theatre", uk: "Theatre", es: "Theatre", de: "Theatre", fr: "Theatre" },
  "Музеи": { en: "Museums", uk: "Museums", es: "Museums", de: "Museums", fr: "Museums" },
  "Уличное искусство": { en: "Street art", uk: "Street art", es: "Street art", de: "Street art", fr: "Street art" },
  "Фестивали города": { en: "City festivals", uk: "City festivals", es: "City festivals", de: "City festivals", fr: "City festivals" },
  "Автомобили": { en: "Cars", uk: "Cars", es: "Cars", de: "Cars", fr: "Cars" },
  "Электромобили": { en: "EVs", uk: "EVs", es: "EVs", de: "EVs", fr: "EVs" },
  "Мотоциклы": { en: "Motorcycles", uk: "Motorcycles", es: "Motorcycles", de: "Motorcycles", fr: "Motorcycles" },
  "Велосипеды": { en: "Bicycles", uk: "Bicycles", es: "Bicycles", de: "Bicycles", fr: "Bicycles" },
  "Гаджеты для дома": { en: "Home gadgets", uk: "Home gadgets", es: "Home gadgets", de: "Home gadgets", fr: "Home gadgets" },
  "Умный дом": { en: "Smart home", uk: "Smart home", es: "Smart home", de: "Smart home", fr: "Smart home" },
  "Природа": { en: "Nature", uk: "Nature", es: "Nature", de: "Nature", fr: "Nature" },
  "Походы": { en: "Hiking", uk: "Hiking", es: "Hiking", de: "Hiking", fr: "Hiking" },
  "Кемпинг": { en: "Camping", uk: "Camping", es: "Camping", de: "Camping", fr: "Camping" },
  "Животные": { en: "Animals", uk: "Animals", es: "Animals", de: "Animals", fr: "Animals" },
  "Экология": { en: "Ecology", uk: "Ecology", es: "Ecology", de: "Ecology", fr: "Ecology" },
  "Садоводство": { en: "Gardening", uk: "Gardening", es: "Gardening", de: "Gardening", fr: "Gardening" },
  "Настольные игры": { en: "Board games", uk: "Board games", es: "Board games", de: "Board games", fr: "Board games" },
  "Коллекционирование": { en: "Collecting", uk: "Collecting", es: "Collecting", de: "Collecting", fr: "Collecting" },
  "DIY": { en: "DIY", uk: "DIY", es: "DIY", de: "DIY", fr: "DIY" },
  "Рукоделие": { en: "Crafts", uk: "Crafts", es: "Crafts", de: "Crafts", fr: "Crafts" },
  "Шахматы": { en: "Chess", uk: "Chess", es: "Chess", de: "Chess", fr: "Chess" },
  "Астрономия": { en: "Astronomy", uk: "Astronomy", es: "Astronomy", de: "Astronomy", fr: "Astronomy" },
  "Рыбалка": { en: "Fishing", uk: "Fishing", es: "Fishing", de: "Fishing", fr: "Fishing" },
  "Охота за винилом": { en: "Vinyl hunting", uk: "Vinyl hunting", es: "Vinyl hunting", de: "Vinyl hunting", fr: "Vinyl hunting" },
};
const hotNews: Record<string, L10n> = {
  hn1: {
    en: "Friends 0.608 release: new feed and dark glass",
    uk: "Реліз Friends 0.608: нова стрічка і темне скло",
    es: "Lanzamiento Friends 0.608: nuevo feed y cristal oscuro",
    de: "Friends 0.608: neuer Feed und dunkles Glas",
    fr: "Friends 0.608 : nouveau fil et verre sombre",
  },
  hn2: {
    en: "How to set interests so the feed stays interesting",
    uk: "Як налаштувати інтереси, щоб стрічка не була нудною",
    es: "Cómo configurar intereses para que el feed no sea aburrido",
    de: "Interessen einrichten, damit der Feed spannend bleibt",
    fr: "Comment régler les centres d’intérêt pour un fil vivant",
  },
  hn3: {
    en: "Moscow at night: places for a walk",
    uk: "Москва вночі: підбірка місць для прогулянок",
    es: "Moscú de noche: lugares para pasear",
    de: "Moskau bei Nacht: Orte für Spaziergänge",
    fr: "Moscou la nuit : idées de promenades",
  },
  hn4: {
    en: "Indie & electro: fresh tracks of the week",
    uk: "Інді та електро: свіжі треки тижня",
    es: "Indie y electro: tracks frescos de la semana",
    de: "Indie & Elektro: frische Tracks der Woche",
    fr: "Indie et électro : titres de la semaine",
  },
  hn5: {
    en: "What to watch this weekend: a short guide",
    uk: "Що дивитися на вихідних: короткий гід",
    es: "Qué ver el fin de semana: guía corta",
    de: "Wochenend-Watchlist: kurzer Guide",
    fr: "Que regarder ce week-end : guide court",
  },
};

const newsSources: Record<string, L10n> = {
  "Friends News": { en: "Friends News", uk: "Friends News", es: "Friends News", de: "Friends News", fr: "Friends News" },
  Советы: { en: "Tips", uk: "Поради", es: "Consejos", de: "Tipps", fr: "Conseils" },
  Город: { en: "City", uk: "Місто", es: "Ciudad", de: "Stadt", fr: "Ville" },
  Музыка: { en: "Music", uk: "Музика", es: "Música", de: "Musik", fr: "Musique" },
  Кино: { en: "Movies", uk: "Кіно", es: "Cine", de: "Film", fr: "Cinéma" },
};

const shortcuts: Record<string, L10n> = {
  "Фильмы ужасов": {
    en: "Horror movies",
    uk: "Фільми жахів",
    es: "Películas de terror",
    de: "Horrorfilme",
    fr: "Films d’horreur",
  },
  "Эмулятор xbox 360": {
    en: "Xbox 360 emulator",
    uk: "Емулятор xbox 360",
    es: "Emulador xbox 360",
    de: "Xbox-360-Emulator",
    fr: "Émulateur xbox 360",
  },
  "Корона Вирус": {
    en: "Corona Virus",
    uk: "Корона Вірус",
    es: "Corona Virus",
    de: "Corona Virus",
    fr: "Corona Virus",
  },
  "Мои гости": {
    en: "My guests",
    uk: "Мої гості",
    es: "Mis visitas",
    de: "Meine Gäste",
    fr: "Mes invités",
  },
};

const videoTitles: Record<string, L10n> = {
  "Вечерний драйв": {
    en: "Evening drive",
    uk: "Вечірній драйв",
    es: "Paseo nocturno",
    de: "Abendfahrt",
    fr: "Balade du soir",
  },
  "Как устроен Friends": {
    en: "How Friends works",
    uk: "Як влаштований Friends",
    es: "Cómo funciona Friends",
    de: "So funktioniert Friends",
    fr: "Comment marche Friends",
  },
  "Семейный ужин": {
    en: "Family dinner",
    uk: "Сімейна вечеря",
    es: "Cena familiar",
    de: "Familienessen",
    fr: "Dîner en famille",
  },
  "Без названия": {
    en: "Untitled",
    uk: "Без назви",
    es: "Sin título",
    de: "Ohne Titel",
    fr: "Sans titre",
  },
};

const videoDescriptions: Record<string, L10n> = {
  "Короткий клип под плейлист Ночной драйв": {
    en: "A short clip for the Night Drive playlist",
    uk: "Короткий кліп під плейлист Нічний драйв",
    es: "Un clip corto para la playlist Night Drive",
    de: "Kurzer Clip zur Playlist Night Drive",
    fr: "Un court clip pour la playlist Night Drive",
  },
  "Мини-демо интерфейса для близкого круга": {
    en: "A mini demo of the close-circle interface",
    uk: "Міні-демо інтерфейсу для близького кола",
    es: "Mini demo de la interfaz del círculo cercano",
    de: "Mini-Demo der Interface für den engen Kreis",
    fr: "Mini démo de l’interface du cercle proche",
  },
  "Домашнее видео для круга": {
    en: "A home video for the circle",
    uk: "Домашнє відео для кола",
    es: "Un vídeo casero para el círculo",
    de: "Heimvideo für den Kreis",
    fr: "Une vidéo maison pour le cercle",
  },
  "Добавлено вами": {
    en: "Added by you",
    uk: "Додано вами",
    es: "Añadido por ti",
    de: "Von dir hinzugefügt",
    fr: "Ajouté par vous",
  },
};

const todayAt: L10n = {
  en: "today at {time}",
  uk: "сьогодні о {time}",
  es: "hoy a las {time}",
  de: "heute um {time}",
  fr: "aujourd’hui à {time}",
};

export function contentAlbum(locale: Locale, id: string, fallback: string) {
  const map = albums[id];
  return map ? pick(map, locale, fallback) : fallback;
}

export function contentPhotoTitle(locale: Locale, title: string) {
  const map = photoTitles[title];
  return map ? pick(map, locale, title) : title;
}

export function contentVideoTitle(locale: Locale, title: string) {
  const map = videoTitles[title];
  return map ? pick(map, locale, title) : title;
}

export function contentVideoDescription(locale: Locale, description: string) {
  const map = videoDescriptions[description];
  return map ? pick(map, locale, description) : description;
}

export function contentDateLabel(locale: Locale, label: string) {
  if (locale === "ru") return label;
  const today = label.match(/^сегодня в\s+(\d{1,2}:\d{2})$/i);
  if (today) {
    return pick(todayAt, locale, label).replace("{time}", today[1]);
  }
  const m = label.match(/^(\d+)\s+([а-яё]+)$/i);
  if (!m) return label;
  const month = months[m[2].toLowerCase()];
  if (!month) return label;
  return `${m[1]} ${pick(month, locale, m[2])}`;
}

export function contentInterest(locale: Locale, tag: string) {
  const map = interests[tag];
  return map ? pick(map, locale, tag) : tag;
}

export function contentHotNews(locale: Locale, id: string, fallback: string) {
  const map = hotNews[id];
  return map ? pick(map, locale, fallback) : fallback;
}

export function contentNewsSource(locale: Locale, source: string) {
  const map = newsSources[source];
  return map ? pick(map, locale, source) : source;
}

export function contentShortcut(locale: Locale, label: string) {
  const map = shortcuts[label];
  return map ? pick(map, locale, label) : label;
}
