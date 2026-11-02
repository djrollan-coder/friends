import SwiftUI

struct LoginView: View {
    var onLogin: (String) -> Void
    @State private var tab: LoginTab = .email
    @State private var busy = false
    @State private var email = ""
    @State private var password = ""
    @State private var error = ""

    enum LoginTab: String, CaseIterable, Identifiable {
        case email = "Почта"
        case telegram = "Telegram"
        case qr = "QR"
        var id: String { rawValue }
    }

    var body: some View {
        ZStack {
            FriendsTheme.bg.ignoresSafeArea()
            RadialGradient(
                colors: [FriendsTheme.accent.opacity(0.22), .clear],
                center: .top,
                startRadius: 20,
                endRadius: 420
            )
            .ignoresSafeArea()

            VStack(spacing: 18) {
                HStack(spacing: 12) {
                    Text("F")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(
                            LinearGradient(
                                colors: [Color(red: 0.83, green: 0.54, blue: 0.35), FriendsTheme.accent],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Friends")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Вход в социальную сеть")
                            .font(.system(size: 13))
                            .foregroundStyle(FriendsTheme.muted)
                    }
                    Spacer()
                }

                HStack(spacing: 4) {
                    ForEach(LoginTab.allCases) { item in
                        Button {
                            tab = item
                            error = ""
                        } label: {
                            Text(item.rawValue)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(tab == item ? .white : FriendsTheme.muted)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(tab == item ? Color(red: 0.165, green: 0.165, blue: 0.169) : .clear)
                                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(4)
                .background(FriendsTheme.panelAlt)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                PanelCard {
                    switch tab {
                    case .email:
                        emailForm
                    case .telegram:
                        telegramForm
                    case .qr:
                        qrForm
                    }
                }

                Spacer()
            }
            .padding(20)
        }
    }

    private var emailForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Войдите по email и паролю.")
                .foregroundStyle(FriendsTheme.text)
                .font(.system(size: 14))

            VStack(alignment: .leading, spacing: 6) {
                Text("Email")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(FriendsTheme.muted)
                TextField("name@email.com", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .padding(12)
                    .background(FriendsTheme.panelAlt)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .foregroundStyle(FriendsTheme.text)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Пароль")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(FriendsTheme.muted)
                SecureField("••••••••", text: $password)
                    .padding(12)
                    .background(FriendsTheme.panelAlt)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .foregroundStyle(FriendsTheme.text)
            }

            if !error.isEmpty {
                Text(error)
                    .font(.system(size: 13))
                    .foregroundStyle(Color(red: 1, green: 0.42, blue: 0.42))
            }

            Button {
                guard email.contains("@"), password.count >= 4 else {
                    error = password.count < 4 ? "Пароль минимум 4 символа" : "Введите корректный email"
                    return
                }
                busy = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                    busy = false
                    onLogin("email")
                }
            } label: {
                Text(busy ? "Входим…" : "Войти")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 46)
                    .background(
                        LinearGradient(
                            colors: [Color(red: 0.83, green: 0.54, blue: 0.35), FriendsTheme.accent],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(busy)
            .buttonStyle(.plain)
        }
    }

    private var telegramForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Войдите через Telegram — без пароля.")
                .foregroundStyle(FriendsTheme.text)
                .font(.system(size: 14))

            Button {
                busy = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    busy = false
                    onLogin("telegram")
                }
            } label: {
                Text(busy ? "Входим…" : "Войти через Telegram")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 46)
                    .background(
                        LinearGradient(
                            colors: [Color(red: 0.83, green: 0.54, blue: 0.35), FriendsTheme.accent],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(busy)
            .buttonStyle(.plain)
        }
    }

    private var qrForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Отсканируйте QR с компьютера или подтвердите вход на другом устройстве.")
                .foregroundStyle(FriendsTheme.text)
                .font(.system(size: 14))

            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.white)
                .frame(height: 220)
                .overlay {
                    VStack(spacing: 8) {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 44, weight: .regular))
                            .foregroundStyle(.black.opacity(0.75))
                        Text("Сканер QR")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.black.opacity(0.55))
                    }
                }

            Button {
                onLogin("qr")
            } label: {
                Text("Я отсканировал / подтвердить")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(FriendsTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
        }
    }
}
