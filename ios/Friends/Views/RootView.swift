import SwiftUI
import WebKit

struct RootView: View {
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var bridge = FriendsWebBridge.shared

    var body: some View {
        ZStack {
            // Paint under Dynamic Island / home indicator
            Color.black.ignoresSafeArea()

            // WebView stays inside the safe area so the island never covers chrome
            FriendsWebContainer()
        }
        .preferredColorScheme(.dark)
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
        // Native shell already insets the WebView — don't double-pad with CSS safe-top.
        let boot = WKUserScript(
            source: """
            window.__FRIENDS_NATIVE__=true;
            (function(){
              var r=document.documentElement;
              r.classList.add('is-native-ios');
              r.classList.add('is-native-safe-inset');
              r.style.setProperty('--sat','0px');
              r.style.setProperty('--sab','0px');
              r.style.setProperty('--sal','0px');
              r.style.setProperty('--sar','0px');
              r.style.setProperty('--safe-top','0px');
              r.style.setProperty('--safe-bottom','0px');
              r.style.setProperty('--safe-left','0px');
              r.style.setProperty('--safe-right','0px');
            })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        userContent.addUserScript(boot)

        let config = WKWebViewConfiguration()
        config.userContentController = userContent
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        if #available(iOS 15.0, *) {
            config.preferences.isElementFullscreenEnabled = true
        }

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        // System safe-area is applied by SwiftUI layout; don't add extra scroll insets.
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.alwaysBounceVertical = true
        webView.scrollView.contentInset = .zero
        webView.scrollView.scrollIndicatorInsets = .zero
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        bridge.attach(webView)
        webView.load(URLRequest(url: bridge.homeURL))
        DispatchQueue.main.async {
            bridge.syncSafeAreaInsets()
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        DispatchQueue.main.async {
            bridge.syncSafeAreaInsets()
        }
    }

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

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            bridge.syncSafeAreaInsets()
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

            if let host = url.host?.lowercased(), host == "oauth.telegram.org" {
                decisionHandler(.allow)
                return
            }

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
