import SwiftUI
import WebKit

struct RootView: View {
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var bridge = FriendsWebBridge.shared

    var body: some View {
        FriendsWebContainer()
            .ignoresSafeArea()
            .background(Color.black)
            .onOpenURL { url in
                bridge.handleIncomingURL(url)
            }
            .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                if let url = activity.webpageURL {
                    bridge.handleIncomingURL(url)
                }
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active {
                    bridge.resumeAuthPoll()
                }
            }
    }
}

private struct FriendsWebContainer: UIViewRepresentable {
    @ObservedObject var bridge = FriendsWebBridge.shared

    func makeCoordinator() -> Coordinator {
        Coordinator(bridge: bridge)
    }

    func makeUIView(context: Context) -> WKWebView {
        let userContent = WKUserContentController()
        userContent.add(context.coordinator, name: "friends")
        let boot = WKUserScript(
            source: "window.__FRIENDS_NATIVE__=true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        userContent.addUserScript(boot)

        let config = WKWebViewConfiguration()
        config.userContentController = userContent
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        bridge.attach(webView)
        webView.load(URLRequest(url: bridge.homeURL))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        let bridge: FriendsWebBridge

        init(bridge: FriendsWebBridge) {
            self.bridge = bridge
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "friends" else { return }
            guard let body = message.body as? [String: Any],
                  let type = body["type"] as? String,
                  let raw = body["url"] as? String,
                  let url = URL(string: raw)
            else { return }

            if type == "openTelegram" || type == "openExternal" {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if bridge.isAppHost(url) || url.scheme == "about" || url.scheme == "blob" {
                decisionHandler(.allow)
                return
            }

            // Keep Telegram OAuth pages inside the webview when possible.
            if let host = url.host?.lowercased(), host == "oauth.telegram.org" {
                decisionHandler(.allow)
                return
            }

            // t.me / telegram links → open Telegram app, stay in Friends webview.
            if bridge.isTelegramHost(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
                decisionHandler(.cancel)
                return
            }

            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            decisionHandler(.cancel)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let url = navigationAction.request.url {
                if bridge.isAppHost(url) || url.host?.lowercased() == "oauth.telegram.org" {
                    webView.load(URLRequest(url: url))
                } else if bridge.isTelegramHost(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                } else {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            }
            return nil
        }
    }
}
