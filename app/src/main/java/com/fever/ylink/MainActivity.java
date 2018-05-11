package com.fever.ylink;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.Menu;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private TextView inpURL = null;
    private TextView statusBar = null;
    private TextView emptyTextView = null;
    private ClipboardManager clipboard = null;

    private Integer callbackIndex = 0;
    private HashMap<String, ObjectCallback> cbMap = new HashMap<>();

    private WebView webView = null;

    private Boolean isReady = false;
    private List<JSONObject> onReadyMessageStack = new ArrayList<>();

    interface ObjectCallback {
        void call(Object result, Exception error);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);

        inpURL = (TextView) findViewById(R.id.inpURL);
        statusBar = (TextView) findViewById(R.id.statusBar);
        clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        emptyTextView = (TextView) findViewById(R.id.emptyTextView);

        Button btnClear = (Button) findViewById(R.id.btnClear);
        Button btnPaste = (Button) findViewById(R.id.btnPaste);
        Button btnGetLink = (Button) findViewById(R.id.btnGetLink);

        btnClear.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                inpURL.setText("");
                destroyWebView();
            }
        });
        btnPaste.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                ClipData clip = clipboard.getPrimaryClip();
                if (clip != null && clip.getItemCount() != 0) {
                    Integer index = 0;
                    ClipData.Item item = clip.getItemAt(index);
                    String text = item.getText().toString();
                    inpURL.setText(text);
                }
            }
        });
        btnGetLink.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                getUrlLinks(inpURL.getText().toString());
            }
        });
    }

    private void getUrlLinks(final String url) {
        ArrayList args = new ArrayList(){{
            add(url);
        }};
        callFn("getVideoLink", args, null);
    }

    private void initWebView() {
        setStatusText("Loading");
        webView = new WebView(this);
        webView.addJavascriptInterface(new JsObject(), "parent");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            webView.setWebContentsDebuggingEnabled(true);
        }

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
        builder.setPositiveButton(positiveButton, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                Log.d("openDialog", "True");
                callback.call(true, null);
            }
        });
        builder.setNegativeButton(negativeButton, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                Log.d("openDialog", "False");
                callback.call(false, null);
            }
        });
        builder.setOnCancelListener(new DialogInterface.OnCancelListener() {
            @Override
            public void onCancel(DialogInterface dialogInterface) {
                Log.d("openDialog", "Cancel");
                callback.call(null, new Exception("Canceled"));
            }
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

                openDialog(title, message, positiveButton, negativeButton, new ObjectCallback() {
                    @Override
                    public void call(Object result, Exception err) {
                        postResponseMessage(result, err, callbackId);
                    }
                });
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
                startActivity(intent.createChooser(intent, "Chose application"));
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

    private void callFn(String fn, ArrayList args, ObjectCallback callback) {
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
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    String script = "(function(message){" +
                            "window.onmessage({data:message});" +
                            "})(" + msg.toString() + ");";
                    webView.loadUrl("javascript:" + script);
                }
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d("myApp", "onResume");

        Intent intent = getIntent();
        String type = intent.getType();
        if (Intent.ACTION_SEND.equals(intent.getAction()) && type != null) {
            if ("text/plain".equals(type)) {
                handleSendText(intent); // Handle text being sent
            }
        }
    }

    @Override
    protected void onStop() {
        super.onStop();  // Always call the superclass method first

        destroyWebView();
    }

    private void handleSendText(Intent intent) {
        final String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        intent.removeExtra(Intent.EXTRA_TEXT);

        Log.d("myApp", "handleSendText " + sharedText);

        if (sharedText != null) {
            inpURL.setText(sharedText);
            getUrlLinks(sharedText);
        }
    }

    private void setStatusText(final String text) {
        runOnUiThread(new Runnable() {
            public void run() {
                statusBar.setText(text);
            }
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        menu.clear();

        return true;
    }

}