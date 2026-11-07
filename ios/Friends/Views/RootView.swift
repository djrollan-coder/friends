import SwiftUI
import WebKit
import PhotosUI

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
        // Disable WKWebView built-in back swipe (it triggered the web sidebar).
        // A custom left-edge gesture below calls history.back() instead.
        webView.allowsBackForwardNavigationGestures = false
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

        // Left-edge swipe → history.back() (replaces WKWebView's built-in gesture)
        let edgePan = UIScreenEdgePanGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleBackEdgeSwipe(_:))
        )
        edgePan.edges = .left
        webView.addGestureRecognizer(edgePan)

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        DispatchQueue.main.async {
            bridge.syncSafeAreaInsets()
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, PHPickerViewControllerDelegate {
        let bridge: FriendsWebBridge
        var pendingPhotoKind: String = "photo"
        var pendingPhotoRequestId: String = ""

        init(bridge: FriendsWebBridge) {
            self.bridge = bridge
        }

        @objc func handleBackEdgeSwipe(_ recognizer: UIScreenEdgePanGestureRecognizer) {
            guard recognizer.state == .recognized else { return }
            bridge.webView?.evaluateJavaScript("history.back()", completionHandler: nil)
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "friends" else { return }
            guard let body = message.body as? [String: Any],
                  let type = body["type"] as? String
            else { return }

            if type == "pickPhoto" {
                pendingPhotoKind = (body["kind"] as? String) ?? "photo"
                pendingPhotoRequestId = (body["requestId"] as? String) ?? ""
                var config = PHPickerConfiguration(photoLibrary: .shared())
                config.selectionLimit = 1
                config.filter = .images
                let picker = PHPickerViewController(configuration: config)
                picker.delegate = self
                guard let host = Self.topViewController(from: bridge.webView) else { return }
                host.present(picker, animated: true)
                return
            }

            guard let raw = body["url"] as? String, let url = URL(string: raw) else { return }

            if type == "openTelegram" || type == "openExternal" {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)
            let kind = pendingPhotoKind
            let requestId = pendingPhotoRequestId
            guard let result = results.first else {
                deliverPhoto("", kind: kind, requestId: requestId)
                return
            }
            let provider = result.itemProvider
            if provider.canLoadObject(ofClass: UIImage.self) {
                provider.loadObject(ofClass: UIImage.self) { [weak self] object, _ in
                    self?.finishPickedImage(object as? UIImage, kind: kind, requestId: requestId)
                }
                return
            }
            provider.loadDataRepresentation(forTypeIdentifier: "public.image") { [weak self] data, _ in
                let image = data.flatMap(UIImage.init(data:))
                self?.finishPickedImage(image, kind: kind, requestId: requestId)
            }
        }

        private func finishPickedImage(_ image: UIImage?, kind: String, requestId: String) {
            guard let image else {
                deliverPhoto("", kind: kind, requestId: requestId)
                return
            }
            // Keep payloads small for WKWebView. Cover stays full-frame — web CoverAdjuster crops.
            let jpeg: Data?
            if kind == "cover" {
                jpeg = Self.jpegData(from: image, maxSide: 1400, quality: 0.7, maxBytes: 700_000)
            } else {
                jpeg = Self.jpegData(from: image, maxSide: 400, quality: 0.58, maxBytes: 110_000)
            }
            guard let jpeg, !jpeg.isEmpty else {
                deliverPhoto("", kind: kind, requestId: requestId)
                return
            }
            deliverPhoto(
                "data:image/jpeg;base64,\(jpeg.base64EncodedString())",
                kind: kind,
                requestId: requestId
            )
        }

        private func deliverPhoto(_ dataUrl: String, kind: String, requestId: String) {
            let resolvedKind = kind.isEmpty ? pendingPhotoKind : kind
            let resolvedRequestId = requestId.isEmpty ? pendingPhotoRequestId : requestId
            DispatchQueue.main.async {
                guard let webView = self.bridge.webView else { return }
                // Echo kind + requestId so the web UI never applies a stale pick to the other slot.
                webView.callAsyncJavaScript(
                    """
                    if (typeof window.__FRIENDS_PHOTO_CALLBACK__ === 'function') {
                      window.__FRIENDS_PHOTO_CALLBACK__(dataUrl, kind, requestId);
                    }
                    """,
                    arguments: [
                        "dataUrl": dataUrl,
                        "kind": resolvedKind,
                        "requestId": resolvedRequestId,
                    ],
                    in: nil,
                    in: .page
                ) { result in
                    if case .failure = result {
                        let safeKind = resolvedKind.replacingOccurrences(of: "'", with: "")
                        let safeReq = resolvedRequestId.replacingOccurrences(of: "'", with: "")
                        webView.evaluateJavaScript(
                            "if(typeof window.__FRIENDS_PHOTO_CALLBACK__==='function'){window.__FRIENDS_PHOTO_CALLBACK__('','\(safeKind)','\(safeReq)')}",
                            completionHandler: nil
                        )
                    }
                }
            }
        }

        private static func topViewController(from webView: WKWebView?) -> UIViewController? {
            var top = webView?.window?.rootViewController
            while let presented = top?.presentedViewController {
                top = presented
            }
            return top
        }

        /// Decode HEIC/PNG/JPEG → resized JPEG for the WebView.
        private static func jpegData(
            from image: UIImage,
            maxSide: CGFloat,
            quality: CGFloat,
            maxBytes: Int = 200_000
        ) -> Data? {
            let pixelWidth = image.size.width * image.scale
            let pixelHeight = image.size.height * image.scale
            guard pixelWidth > 0, pixelHeight > 0 else { return nil }

            var side = maxSide
            var q = quality
            var best: Data?

            for _ in 0..<7 {
                let scale = min(1, side / max(pixelWidth, pixelHeight))
                let target = CGSize(
                    width: max(1, (pixelWidth * scale).rounded()),
                    height: max(1, (pixelHeight * scale).rounded())
                )
                let format = UIGraphicsImageRendererFormat.default()
                format.scale = 1
                format.opaque = true
                let renderer = UIGraphicsImageRenderer(size: target, format: format)
                let rendered = renderer.image { _ in
                    UIColor.white.setFill()
                    UIBezierPath(rect: CGRect(origin: .zero, size: target)).fill()
                    image.draw(in: CGRect(origin: .zero, size: target))
                }
                guard let data = rendered.jpegData(compressionQuality: q) else { break }
                best = data
                if data.count <= maxBytes { return data }
                side = max(240, side * 0.82)
                q = max(0.4, q - 0.07)
            }
            return best
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
