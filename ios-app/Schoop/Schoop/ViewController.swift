//
//  ViewController.swift
//  Schoop
//
//  Created by Zane St. John on 5/1/20.
//  Copyright © 2020 Zane St. John. All rights reserved.
//

import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate {
    var webView: WKWebView!
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    
    override func loadView() {
        let schoopColor = UIColor(red: 48/255, green: 84/255, blue: 117/255, alpha: 1);
        webView = WKWebView()
        webView.navigationDelegate = self
//        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4130.3 Safari/537.36";
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Schoop/1.0 Safari/537.36";
        webView.backgroundColor = schoopColor;
        view = webView
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let schoopColor = UIColor(red: 48/255, green: 84/255, blue: 117/255, alpha: 1);
        
        // from https://freakycoder.com/ios-notes-13-how-to-change-status-bar-color-1431c185e845
        if #available(iOS 13.0, *) {
            let app = UIApplication.shared
            let statusBarHeight: CGFloat = app.statusBarFrame.size.height
            
            let statusbarView = UIView()
            statusbarView.backgroundColor = schoopColor
            view.addSubview(statusbarView)
          
            statusbarView.translatesAutoresizingMaskIntoConstraints = false
            statusbarView.heightAnchor
                .constraint(equalToConstant: statusBarHeight).isActive = true
            statusbarView.widthAnchor
                .constraint(equalTo: view.widthAnchor, multiplier: 1.0).isActive = true
            statusbarView.topAnchor
                .constraint(equalTo: view.topAnchor).isActive = true
            statusbarView.centerXAnchor
                .constraint(equalTo: view.centerXAnchor).isActive = true
          
        } else {
            let statusBar = UIApplication.shared.value(forKeyPath: "statusBarWindow.statusBar") as? UIView
            statusBar?.backgroundColor = schoopColor
        }
        
        // 1
        let url = URL(string: "https://schoop.app")!
        webView.load(URLRequest(url: url))
          
        // 2
        let refresh = UIBarButtonItem(barButtonSystemItem: .refresh, target: webView, action: #selector(webView.reload))
        toolbarItems = [refresh]
        navigationController?.isToolbarHidden = false
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        title = webView.title
    }


}

