package com.site2app.monapp;
import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.DownloadListener;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;




public class MainActivity extends Activity {
    public class WebAppInterface {
        Context mContext;
        WebAppInterface(Context c) { mContext = c; }
        
        @JavascriptInterface
        public void showNotification(String id, String title, String body) {
            NotificationManager nm = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel("SITE2APP_PUSH", "Push Notifications", NotificationManager.IMPORTANCE_HIGH);
                nm.createNotificationChannel(channel);
            }
            
            Intent intent = new Intent(mContext, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(mContext, 0, intent, flags);
            
            Notification.Builder nb;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                nb = new Notification.Builder(mContext, "SITE2APP_PUSH");
            } else {
                nb = new Notification.Builder(mContext);
            }
            
            int iconId = mContext.getResources().getIdentifier("ic_launcher", "mipmap", mContext.getPackageName());
            if(iconId == 0) iconId = android.R.drawable.ic_dialog_info;

            Notification n = nb.setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(iconId)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build();
                
            nm.notify(id != null ? id.hashCode() : 1, n);
            
            runOnUiThread(new Runnable() {
                public void run() {
                    // Optional toast Toast.makeText(mContext, "New notification: " + title, Toast.LENGTH_LONG).show();
                }
            });
        }
        
        @JavascriptInterface
        public void requestPushNotifications() {
            // Deprecated: Push notifications are now natively handled via auto-prompt on Android 13+
            // and FCM token registration in onCreate().
            runOnUiThread(new Runnable() {
                public void run() {
                    if (Build.VERSION.SDK_INT >= 33) {
                        if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                            requestPermissions(new String[]{ "android.permission.POST_NOTIFICATIONS" }, 1003);
                        }
                    }
                }
            });
        }
    }

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int PERMISSION_REQUEST = 1002;



    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar + navigation bar color
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#1a1a2e"));
            window.setNavigationBarColor(Color.parseColor("#1a1a2e"));
            
        }

        // Layout: ProgressBar on top of WebView
        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.WHITE);

        webView = new WebView(this);
        layout.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 6);
        layout.addView(progressBar, pbParams);

        setContentView(layout);


        setupWebView();
        requestPermissions();
        android.content.SharedPreferences prefs = getSharedPreferences("S2A_PREFS", android.content.Context.MODE_PRIVATE);
        String storedToken = prefs.getString("s2a_push_token", "");
        String baseUrl = "";
        if (!storedToken.isEmpty() && !baseUrl.contains("s2a_token=")) {
            baseUrl += (baseUrl.contains("?") ? "&" : "?") + "s2a_token=" + storedToken;
        }

        webView.loadUrl(baseUrl);
        
        checkForUpdates();
    }
    
    private void checkForUpdates() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL("http://10.0.2.2:4000/api/apps/check-update?package=com.site2app.monapp&versionCode=1");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    
                    if (conn.getResponseCode() == 200) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        reader.close();
                        
                        JSONObject result = new JSONObject(sb.toString());
                        if (result.optBoolean("updateAvailable")) {
                            final String downloadUrl = result.optString("downloadUrl");
                            final String vName = result.optString("versionName");
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    new AlertDialog.Builder(MainActivity.this)
                                        .setTitle("Mise à jour disponible")
                                        .setMessage("Une nouvelle version de l'application (v" + vName + ") est requise. Voulez-vous télécharger la mise à jour ?")
                                        .setPositiveButton("Mettre à jour", new DialogInterface.OnClickListener() {
                                            public void onClick(DialogInterface dialog, int which) {
                                                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl));
                                                startActivity(browserIntent);
                                            }
                                        })
                                        .setNegativeButton("Plus tard", null)
                                        .setCancelable(false)
                                        .show();
                                }
                            });
                        }
                    }
                } catch (Exception e) {
                    // Fail silently
                }
            }
        }).start();
    }

    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setGeolocationEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " MonApp/1.0");




        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }
        CookieManager.getInstance().setAcceptCookie(true);
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                
                // Expose a requestPushNotifications so existing user scripts don't break
                
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("whatsapp:") || url.startsWith("intent:")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) {}
                    return true;
                }
                
                android.content.SharedPreferences prefs = view.getContext().getSharedPreferences("S2A_PREFS", android.content.Context.MODE_PRIVATE);
                String storedToken = prefs.getString("s2a_push_token", "");
                if (!storedToken.isEmpty() && (url.startsWith("http://") || url.startsWith("https://"))) {
                    if (!url.contains("s2a_token=")) {
                        String newUrl = url + (url.contains("?") ? "&" : "?") + "s2a_token=" + storedToken;
                        view.loadUrl(newUrl);
                        return true;
                    }
                }
                return false;
            }
            // For older Android versions compatibility
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("whatsapp:") || url.startsWith("intent:")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) {}
                    return true;
                }
                
                android.content.SharedPreferences prefs = view.getContext().getSharedPreferences("S2A_PREFS", android.content.Context.MODE_PRIVATE);
                String storedToken = prefs.getString("s2a_push_token", "");
                if (!storedToken.isEmpty() && (url.startsWith("http://") || url.startsWith("https://"))) {
                    if (!url.contains("s2a_token=")) {
                        String newUrl = url + (url.contains("?") ? "&" : "?") + "s2a_token=" + storedToken;
                        view.loadUrl(newUrl);
                        return true;
                    }
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setProgress(progress);
                if (progress >= 100) progressBar.setVisibility(View.GONE);
            }
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try { startActivityForResult(intent, FILE_CHOOSER_REQUEST); }
                catch (Exception e) { fileUploadCallback = null; return false; }
                return true;
            }

        });

        // Downloads
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    request.setTitle(filename);
                    request.setDescription("Downloading...");
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    request.setMimeType(mimetype);
                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    if (dm != null) dm.enqueue(request);
                    Toast.makeText(MainActivity.this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ex) {}
                }
            }
        });
    }

    private void requestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.List<String> permsList = new java.util.ArrayList<>();
            
            
            
            
            if (permsList.isEmpty()) return;
            
            String[] perms = permsList.toArray(new String[0]);
            boolean needRequest = false;
            for (String p : perms) {
                if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) { needRequest = true; break; }
            }
            if (needRequest) requestPermissions(perms, PERMISSION_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && fileUploadCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) results = new Uri[]{ Uri.parse(dataString) };
            }
            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {

        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }



    @Override
    protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }

    @Override
    protected void onPause() { super.onPause(); if (webView != null) webView.onPause(); }

    @Override
    protected void onDestroy() {
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}