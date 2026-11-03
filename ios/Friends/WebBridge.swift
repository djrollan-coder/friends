import Foundation
import UIKit
import WebKit

@MainActor
final class FriendsWebBridge: ObservableObject {
    static let shared = FriendsWebBridge()

    weak var webView: WKWebView?
    let homeURL = URL(string: "https://friends-two-amber.vercel.app")!

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

    /// Push Dynamic Island / home-indicator insets into CSS (WKWebView env() can be 0).
    func syncSafeAreaInsets() {
        guard let webView else { return }
        var insets = webView.safeAreaInsets
        if insets.top < 1, insets.bottom < 1 {
            if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                insets = scene.keyWindow?.safeAreaInsets
                    ?? scene.windows.first?.safeAreaInsets
                    ?? insets
            }
        }
        // iPhone 17 Pro fallbacks if insets still unavailable (Dynamic Island + home bar)
        let top = insets.top > 0 ? insets.top : 59
        let bottom = insets.bottom > 0 ? insets.bottom : 34
        let left = insets.left
        let right = insets.right
        let js = """
        (function(){
          var r = document.documentElement;
          r.style.setProperty('--sat', '\(top)px');
          r.style.setProperty('--sab', '\(bottom)px');
          r.style.setProperty('--sal', '\(left)px');
          r.style.setProperty('--sar', '\(right)px');
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
