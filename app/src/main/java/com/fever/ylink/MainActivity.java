package com.fever.ylink;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.Menu;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.TextView;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class MainActivity extends AppCompatActivity {

    private TextView inpURL = null;
    private TextView statusBar = null;
    private TextView emptyTextView = null;
    private ClipboardManager clipboard = null;

    private WebView webView = null;

    private Integer callbackIndex = 0;
    private List<Object[]> callbackStack = new ArrayList<>();

    private Boolean isReady = false;
    private List<String> onReadyMessageStack = new ArrayList<>();

    interface MyCallback {
        void callbackCall(JSONObject json);
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
            bridgeSendMessage(message);
        } catch (JSONException e) {
            Log.e("onReady", e.toString());
        }
    }

    private void initWebView() {
        setStatusText("Loading");
        webView = new WebView(this);
        webView.addJavascriptInterface(new JsObject(), "monoBridge");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            webView.setWebContentsDebuggingEnabled(true);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setDomStorageEnabled(true);

        webView.loadUrl("file:///android_asset/index.html");
    }

    private class MyResponse {
        private String callbackId = null;
        private MyResponse(JSONObject msg) throws JSONException {
            this.callbackId = msg.getString("callbackId");
        }
        public void responseCall(JSONObject json) {
            Log.d("responseCall", json.toString());
            JSONObject message = new JSONObject();
            try {
                message.put("mono", true);
                message.put("data", json);
                message.put("responseId", callbackId);
            } catch (JSONException e) {
                Log.e("setMsg", e.toString());
            }
            _bridgeSendMessageWrapper(message.toString());
        }
    }

    private void onReady() {
        Log.d("myApp", "onReady");
        isReady = true;

        for (String message:onReadyMessageStack) {
            _bridgeSendMessageWrapper(message);
        }
        onReadyMessageStack.clear();

        setStatusText("Ready!");
    }

    private void destroyWebView() {
        Log.d("myApp", "destroyWebView");
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        callbackStack.clear();
        isReady = false;

        setStatusText("Sleep");
    }

    private void openDialog(String title, String message, String positiveButton, String negativeButton, final MyCallback callback) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(title);
        builder.setCancelable(false);
        builder.setMessage(message);
        builder.setPositiveButton(positiveButton, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                Log.d("openDialog", "True");
                try {
                    JSONObject json = new JSONObject();
                    json.put("result", true);
                    callback.callbackCall(json);
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
                    callback.callbackCall(json);
                } catch (JSONException e) {
                    Log.e("openDialog", e.toString());
                }
            }
        });
        builder.show();
    }

    private class OnMessage {
        public void ping(JSONObject data, MyResponse response) throws JSONException {
            JSONObject responseMsg = new JSONObject();
            responseMsg.put("action", "pong");
            response.responseCall(responseMsg);
        }
        public void ready(JSONObject data, MyResponse response) {
            onReady();
        }
        public void setStatus(JSONObject data, MyResponse response) throws JSONException {
            setStatusText(data.getString("text"));
        }
        public void openUrl(JSONObject data, MyResponse response) throws JSONException {
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
        public void confirm(JSONObject data, final MyResponse response) throws JSONException {
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

            openDialog(title, message, positiveButton, negativeButton, new MyCallback() {
                public void callbackCall(JSONObject json) {
                    response.responseCall(json);

                    //hook: call change in main thread
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Integer n = new Random().nextInt(100);
                            emptyTextView.setText( n.toString() );
                        }
                    });
                }
            });
        }
    }

    private OnMessage onMessage = new OnMessage();

    public class JsObject {
        @JavascriptInterface
        public void sendMessage(String message) throws JSONException {
            JSONObject jsonObject = new JSONObject(message);
            JSONObject data = jsonObject.getJSONObject("data");

            if (jsonObject.has("responseId")) {
                Integer id = jsonObject.getInt("responseId");
                for (int i = 0; i < callbackStack.size(); i++) {
                    Object[] item = callbackStack.get(i);
                    Integer cbId = (Integer) item[0];
                    if (cbId.equals(id)) {
                        MyCallback cb = (MyCallback) item[1];
                        cb.callbackCall(data);
                        callbackStack.remove(i);
                        break;
                    }
                }
            } else {
                MyResponse response = null;
                if (jsonObject.has("callbackId")) {
                    response = new MyResponse(jsonObject);
                }

                String action = data.getString("action");
                try {
                    Class[] cArg = new Class[2];
                    cArg[0] = JSONObject.class;
                    cArg[1] = MyResponse.class;
                    Method method = onMessage.getClass().getMethod(action, cArg);
                    method.invoke(onMessage, data, response);
                } catch (Exception e) {
                    Log.e("myApp", e.toString());
                }
            }
        }
    }

    private void _bridgeSendMessage(final String message) {
        webView.post(new Runnable() {
            @Override
            public void run() {
                Log.d("_bridgeSendMessage", message.toString());
                String script = "(function(message){" +
                        "window.dispatchEvent(new CustomEvent('monoMessage',{detail:'<'+JSON.stringify(message)}));" +
                        "})("+message+");";

                if (webView != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                        webView.evaluateJavascript(script, new ValueCallback<String>() {
                            @Override
                            public void onReceiveValue(String s) {

                            }
                        });
                    } else {
                        webView.loadUrl("javascript:" + script);
                    }
                }
            }
        });
    }

    private Boolean isMainThread() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Looper.getMainLooper().isCurrentThread();
        } else {
            return Thread.currentThread() == Looper.getMainLooper().getThread();
        }
    }

    private void _bridgeSendMessageWrapper(final String message) {
        if (!isReady) {
            Log.d("myApp", "isStack: " + message);
            onReadyMessageStack.add(message);
            if (webView == null) {
                initWebView();
            }
        } else
        if (isMainThread()) {
            _bridgeSendMessage(message);
        } else {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    _bridgeSendMessage(message);
                }
            });
        }
    }

    private void bridgeSendMessage(final JSONObject data) throws JSONException {
        bridgeSendMessage(data, null);
    }

    private void bridgeSendMessage(final JSONObject data, MyCallback callback) throws JSONException {
        JSONObject message = new JSONObject();

        message.put("mono", true);
        message.put("data", data);

        if (callback != null) {
            Integer id = callbackIndex++;
            Object[] item = new Object[]{id, callback};
            callbackStack.add(item);
            message.put("hasCallback", true);
            message.put("callbackId", id.toString());
        } else {
            message.put("hasCallback", false);
        }

        _bridgeSendMessageWrapper(message.toString());
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