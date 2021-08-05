package com.fever.ylink;

import android.annotation.SuppressLint;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.webkit.JavascriptInterface;
import android.webkit.WebMessage;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private TextView inputUrl = null;
    private TextView statusBar = null;
    private ClipboardManager clipboard = null;

    private Integer callbackIndex = 0;
    private final HashMap<String, ObjectCallback> cbMap = new HashMap<>();

    private WebView webView = null;

    private Boolean isReady = false;
    private final List<JSONObject> onReadyMessageStack = new ArrayList<>();

    interface ObjectCallback {
        void call(Object result, Exception error);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);

        inputUrl = (TextView) findViewById(R.id.inpURL);
        statusBar = (TextView) findViewById(R.id.statusBar);
        clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);

        Button btnClear = (Button) findViewById(R.id.btnClear);
        Button btnPaste = (Button) findViewById(R.id.btnPaste);
        Button btnGetLink = (Button) findViewById(R.id.btnGetLink);

        btnClear.setOnClickListener(view -> {
            inputUrl.setText("");
            destroyWebView();
        });
        btnPaste.setOnClickListener(view -> {
            ClipData clip = clipboard.getPrimaryClip();
            if (clip != null && clip.getItemCount() != 0) {
                int index = 0;
                ClipData.Item item = clip.getItemAt(index);
                String text = item.getText().toString();
                inputUrl.setText(text);
            }
        });
        btnGetLink.setOnClickListener(view -> getUrlLinks(inputUrl.getText().toString()));
    }

    private void getUrlLinks(final String url) {
        ArrayList<String> args = new ArrayList<>();
        args.add(url);
        callFn("getVideoLink", args, null);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void initWebView() {
        setStatusText("Loading");
        WebView.setWebContentsDebuggingEnabled(true);
        webView = new WebView(this);
        webView.addJavascriptInterface(new JsObject(), "parent");

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setDomStorageEnabled(true);
        settings.setUserAgentString("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36");

        webView.loadUrl("file:///android_asset/index.html");
    }

    private void destroyWebView() {
        Log.d("myApp", "destroyWebView");
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        cbMap.clear();
        isReady = false;

        setStatusText("Sleep");
    }

    private void openDialog(String title, String message, String positiveButton, String negativeButton, final ObjectCallback callback) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(title);
        builder.setMessage(message);
        builder.setPositiveButton(positiveButton, (dialogInterface, i) -> {
            Log.d("openDialog", "True");
            callback.call(true, null);
        });
        builder.setNegativeButton(negativeButton, (dialogInterface, i) -> {
            Log.d("openDialog", "False");
            callback.call(false, null);
        });
        builder.setOnCancelListener(dialogInterface -> {
            Log.d("openDialog", "Cancel");
            callback.call(null, new Exception("Canceled"));
        });
        builder.show();
    }

    public Boolean responseFn(final JSONObject data, final String callbackId) throws JSONException {
        Log.d("responseFn", data.toString());
        String fn = data.getString("fn");
        JSONArray args = data.getJSONArray("args");
        switch (fn) {
            case "ready": {
                isReady = true;

                for (JSONObject msg : onReadyMessageStack) {
                    _postMessage(msg);
                }
                onReadyMessageStack.clear();

                setStatusText("Ready!");
                break;
            }
            case "setStatus": {
                setStatusText(args.getString(0));
                break;
            }
            case "confirm": {
                JSONObject options = args.getJSONObject(0);
                String title = "";
                String message = "";
                String positiveButton = "OK";
                String negativeButton = "Cancel";

                if (options.has("title")) {
                    title = options.getString("title");
                }
                if (options.has("message")) {
                    message = options.getString("message");
                }
                if (options.has("positiveButton")) {
                    positiveButton = options.getString("positiveButton");
                }
                if (options.has("negativeButton")) {
                    negativeButton = options.getString("negativeButton");
                }

                openDialog(title, message, positiveButton, negativeButton, (result, err) -> postResponseMessage(result, err, callbackId));
                return true;
            }
            case "openUrl": {
                JSONObject options = args.getJSONObject(0);
                String url = options.getString("url");
                String mime = "video/*";
                if (options.has("mime")) {
                    mime = options.getString("mime");
                }

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.setDataAndType(Uri.parse(url), mime);
                startActivity(Intent.createChooser(intent, "Chose application"));
            }
        }
        return false;
    }

    public class JsObject {
        @JavascriptInterface
        public void postMessage(String msg, String transferList) throws JSONException {
            Log.d("onPostMessage", msg);
            JSONObject msgObject = new JSONObject(msg);

            if (msgObject.has("responseId")) {
                String responseId = msgObject.getString("responseId");
                if (cbMap.containsKey(responseId)) {
                    ObjectCallback callback = cbMap.get(responseId);
                    if (callback == null) {
                        Log.d("Callback is not found 2", responseId);
                        return;
                    }

                    cbMap.remove(responseId);
                    JSONObject message = msgObject.getJSONObject("message");
                    if (message.has("err")) {
                        JSONObject err = message.getJSONObject("err");
                        String errMessage = "JS Error";
                        if (err.has("message")) {
                            errMessage = err.getString("message");
                        }
                        Exception error = new Exception(errMessage);
                        callback.call(null, error);
                    } else {
                        Object result = message.get("result");
                        callback.call(result, null);
                    }
                } else {
                    Log.d("Callback is not found", responseId);
                }
            } else {
                String callbackId = null;
                if (msgObject.has("callbackId")) {
                    callbackId = msgObject.getString("callbackId");
                }

                JSONObject message = msgObject.getJSONObject("message");
                String action = message.getString("action");
                Boolean result = false;
                if (action.equals("callFn")) {
                    try {
                        result = responseFn(message, callbackId);
                    } catch (Exception err) {
                        Log.e("callAction", err.toString());
                        postResponseMessage(null, err, callbackId);
                        result = true;
                    }
                }
                if (!result && callbackId != null) {
                    postResponseMessage(null, null, callbackId);
                }
            }
        }
    }

    private void callFn(String fn, Collection args, ObjectCallback callback) {
        try {
            JSONObject message = new JSONObject();
            message.put("action", "callFn");
            message.put("fn", fn);
            JSONArray _args = new JSONArray(args);
            message.put("args", _args);

            String callbackId = null;
            if (callback != null) {
                callbackIndex = callbackIndex + 1;
                callbackId = callbackIndex.toString();
                cbMap.put(callbackId, callback);
                message.put("callbackId", callbackId);
            }

            postMessage(message, callbackId);
        } catch (JSONException e) {
            Log.e("onReady", e.toString());
        }
    }

    private void postMessage(Object message, String callbackId) {
        JSONObject msg = new JSONObject();
        try {
            msg.put("message", message);
            if (callbackId != null) {
                msg.put("callbackId", callbackId);
            }

            _postMessage(msg);
        } catch (JSONException e) {
            Log.e("postMessage", e.toString());
        }
    }

    private void postResponseMessage(Object result, Exception err, String callbackId) {
        JSONObject msg = new JSONObject();
        try {
            JSONObject message = new JSONObject();
            if (err != null) {
                JSONObject error = new JSONObject();
                error.put("name", "Internal error");
                error.put("message", err.getMessage());
                error.put("stack", err.getStackTrace());
                error.put("cause", err.getCause());
                message.put("err", error);
            } else {
                message.put("result", result);
            }

            msg.put("message", message);
            if (callbackId != null) {
                msg.put("responseId", callbackId);
            }

            _postMessage(msg);
        } catch (JSONException e) {
            Log.e("postMessage", e.toString());
        }
    }

    private void _postMessage(final JSONObject msg) {
        if (!isReady) {
            Log.d("postMessage, isStack", msg.toString());
            onReadyMessageStack.add(msg);
            if (webView == null) {
                initWebView();
            }
        } else {
            Log.d("postMessage, send", msg.toString());
            runOnUiThread(() -> webView.postWebMessage(new WebMessage(msg.toString()), Uri.parse("*")));
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d("myApp", "onResume");

        Intent intent = getIntent();
        handleExtraText(intent);
    }

    @Override
    protected void onStop() {
        super.onStop();  // Always call the superclass method first

        destroyWebView();
    }

    private void handleExtraText(Intent intent) {
        final String sharedText = intent.getStringExtra("EXTRA_TEXT");
        intent.removeExtra("EXTRA_TEXT");

        Log.d("myApp", "handleExtraText " + sharedText);

        if (sharedText != null) {
            inputUrl.setText(sharedText);
            getUrlLinks(sharedText);
        }
    }

    private void setStatusText(final String text) {
        runOnUiThread(() -> statusBar.setText(text));
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        menu.clear();

        return true;
    }

}