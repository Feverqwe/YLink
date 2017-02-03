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

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private TextView inpURL = null;
    private TextView statusBar = null;
    private TextView emptyTextView = null;
    private ClipboardManager clipboard = null;

    private WebView webView = null;

    private Boolean isReady = false;

    interface MyCallback {
        void call(JSONObject json);
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

    private void getUrlLinks(String url) {
        try {
            JSONObject message = new JSONObject();
            message.put("action", "getVideoLink");
            message.put("url", url);
            postMessage(message);
        } catch (JSONException e) {
            Log.e("onReady", e.toString());
        }
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
        isReady = false;

        setStatusText("Sleep");
    }

    private void openDialog(String title, String message, String positiveButton, String negativeButton, final MyCallback callback) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(title);
        builder.setMessage(message);
        builder.setPositiveButton(positiveButton, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                Log.d("openDialog", "True");
                try {
                    JSONObject json = new JSONObject();
                    json.put("result", true);
                    callback.call(json);
                } catch (JSONException e) {
                    Log.e("openDialog", e.toString());
                }
            }
        });
        builder.setNegativeButton(negativeButton, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                Log.d("openDialog", "False");
                try {
                    JSONObject json = new JSONObject();
                    json.put("result", false);
                    callback.call(json);
                } catch (JSONException e) {
                    Log.e("openDialog", e.toString());
                }
            }
        });
        builder.show();
    }

    private class Actions {
        public void ping(JSONObject data, Integer callbackId) throws JSONException {
            JSONObject responseMsg = new JSONObject();
            responseMsg.put("action", "pong");
            postMessage(responseMsg, callbackId);
        }

        public void ready(JSONObject data, Integer callbackId) throws JSONException {
            Log.d("action ready", data.toString());
            isReady = true;

            for (JSONObject message : onReadyMessageStack) {
                postMessage(message);
            }
            onReadyMessageStack.clear();

            setStatusText("Ready!");
        }

        public void setStatus(JSONObject data, Integer callbackId) throws JSONException {
            setStatusText(data.getString("text"));
        }

        public void openUrl(JSONObject data, Integer callbackId) throws JSONException {
            String url = data.getString("url");
            String mime = "video/*";
            if (data.has("mime")) {
                mime = data.getString("mime");
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.setDataAndType(Uri.parse(url), mime);
            startActivity(intent.createChooser(intent, "Chose application"));
        }

        public void confirm(JSONObject data, final Integer callbackId) throws JSONException {
            String title = "";
            String message = "";
            String positiveButton = "OK";
            String negativeButton = "Cancel";

            if (data.has("title")) {
                title = data.getString("title");
            }
            if (data.has("message")) {
                message = data.getString("message");
            }
            if (data.has("positiveButton")) {
                positiveButton = data.getString("positiveButton");
            }
            if (data.has("negativeButton")) {
                negativeButton = data.getString("negativeButton");
            }

            final Integer fCallbackId = callbackId;
            openDialog(title, message, positiveButton, negativeButton, new MyCallback() {
                public void call(JSONObject json) {
                    postMessage(json, fCallbackId);
                }
            });
        }
    }

    private Actions actions = new Actions();

    public class JsObject {
        @JavascriptInterface
        public void postMessage(String msg, String transferList) throws JSONException {
            JSONObject msgObject = new JSONObject(msg);
            JSONObject message = msgObject.getJSONObject("message");

            Log.d("postMessage, msg", msg);

            Integer callbackId = 0;
            if (msgObject.has("callbackId")) {
                callbackId = msgObject.getInt("callbackId");
            }

            String action = message.getString("action");
            try {
                Class[] cArg = new Class[2];
                cArg[0] = JSONObject.class;
                cArg[1] = Integer.class;
                Method method = actions.getClass().getMethod(action, cArg);
                method.invoke(actions, message, callbackId);
            } catch (Exception e) {
                Log.e("callAction", e.toString());
            }
        }
    }

    private void postMessage(JSONObject message) {
        postMessage(message, 0);
    }

    private List<JSONObject> onReadyMessageStack = new ArrayList<>();

    private void postMessage(JSONObject message, Integer callbackId) {
        if (!isReady) {
            Log.d("postMessage, isStack", message.toString());
            onReadyMessageStack.add(message);
            if (webView == null) {
                initWebView();
            }
        } else {
            Log.d("postMessage, send", message.toString());
            final JSONObject fMessage = message;
            final Integer fCallbackId = callbackId;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        JSONObject msg = new JSONObject();
                        if (fCallbackId > 0) {
                            msg.put("responseId", fCallbackId);
                        }
                        msg.put("message", fMessage);

                        String script = "(function(message){" +
                                "window.onmessage({data:message});" +
                                "})(" + msg.toString() + ");";
                        webView.loadUrl("javascript:" + script);
                    } catch (JSONException e) {
                        Log.e("postMessage", e.toString());
                    }
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