import Foundation
import UIKit
import WebKit

@MainActor
final class FriendsWebBridge: ObservableObject {
    static let shared = FriendsWebBridge()

    weak var webView: WKWebView?
    let homeURL = URL(string: "https://friends-two-amber.vercel.app")!

    /// Last known window safe-area (points). Updated from SwiftUI before ignoresSafeArea zeros them.
    private(set) var windowSafeArea = UIEdgeInsets(top: 62, left: 0, bottom: 34, right: 0)

    func attach(_ webView: WKWebView) {
        self.webView = webView
    }

    func loadHome() {
        load(homeURL)
    }

    func load(_ url: URL) {
        guard let webView else { return }
        webView.load(URLRequest(url: url))
    }

    func updateWindowSafeArea(_ insets: UIEdgeInsets) {
        // Ignore zeroed insets from ignoresSafeArea layouts.
        if insets.top > 1 || insets.bottom > 1 {
            windowSafeArea = insets
        }
        syncSafeAreaInsets()
    }

    /// JS timers pause while Telegram is open — kick auth poll when app is foregrounded.
    func resumeAuthPoll() {
        syncSafeAreaInsets()
        webView?.evaluateJavaScript(
            """
            try {
              if (typeof window.__FRIENDS_RESUME_AUTH__ === 'function') {
                window.__FRIENDS_RESUME_AUTH__();
              }
              document.dispatchEvent(new Event('visibilitychange'));
              window.dispatchEvent(new Event('focus'));
            } catch (e) {}
            """,
            completionHandler: nil
        )
    }

    private func resolvedInsets() -> UIEdgeInsets {
        var insets = windowSafeArea

        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            let window = scene.windows.first(where: \.isKeyWindow) ?? scene.windows.first
            if let window, window.safeAreaInsets.top > 1 {
                insets = window.safeAreaInsets
            }
        }

        // Dynamic Island devices: never go below a solid clearance under the island.
        let minTop: CGFloat = 62
        let minBottom: CGFloat = 34
        if insets.top < minTop { insets.top = minTop }
        if insets.bottom < minBottom { insets.bottom = minBottom }
        return insets
    }

    /// Push Dynamic Island / home-indicator insets into CSS (WKWebView env() is often 0).
    func syncSafeAreaInsets() {
        guard let webView else { return }
        let insets = resolvedInsets()
        let top = insets.top
        let bottom = insets.bottom
        let left = insets.left
        let right = insets.right
        let js = """
        (function(){
          var r = document.documentElement;
          r.style.setProperty('--sat', '\(top)px');
          r.style.setProperty('--sab', '\(bottom)px');
          r.style.setProperty('--sal', '\(left)px');
          r.style.setProperty('--sar', '\(right)px');
          r.style.setProperty('--safe-top', '\(top)px');
          r.style.setProperty('--safe-bottom', '\(bottom)px');
          r.style.setProperty('--safe-left', '\(left)px');
          r.style.setProperty('--safe-right', '\(right)px');
          r.classList.add('is-native-ios');
          r.dataset.device = 'iphone-pro';
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    func handleIncomingURL(_ url: URL) {
        guard isAppHost(url) || url.scheme == "friends" else { return }
        if url.scheme == "friends" {
            // friends://auth?t=... → https://.../login/telegram?t=...
            var comps = URLComponents(url: homeURL, resolvingAgainstBaseURL: false)!
            comps.path = "/login/telegram"
            comps.query = url.query
            if let https = comps.url {
                load(https)
            }
            return
        }
        load(url)
    }

    func isAppHost(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host == "friends-two-amber.vercel.app" || host.hasSuffix(".vercel.app") && host.contains("friends")
    }

    func isTelegramHost(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host == "t.me" || host == "telegram.me" || host.hasSuffix("telegram.org")
    }
}
