import Foundation
import SwiftUI
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

    /// Native layout already respects the safe area — keep CSS insets at 0 to avoid double padding.
    func syncSafeAreaInsets() {
        guard let webView else { return }
        let js = """
        (function(){
          var r = document.documentElement;
          r.classList.add('is-native-ios');
          r.classList.add('is-native-safe-inset');
          ['sat','sab','sal','sar','safe-top','safe-bottom','safe-left','safe-right'].forEach(function(k){
            r.style.setProperty('--'+k, '0px');
          });
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    func handleIncomingURL(_ url: URL) {
        guard isAppHost(url) || url.scheme == "friends" else { return }
        if url.scheme == "friends" {
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
