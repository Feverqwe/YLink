package com.fever.ylink;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {

    private TextView inpURL = null;
    private TextView statusBar = null;
    private ClipboardManager clipboard = null;
    private String videoURL = "";
    private Boolean runOnFound = Boolean.TRUE;
    private String onOpenText = "";

    private Boolean debug = Boolean.FALSE;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (android.os.Build.VERSION.SDK_INT >= 21) {
            setTheme(android.R.style.Theme_Material);
        }

        setContentView(R.layout.activity_main);

        inpURL = (TextView) findViewById(R.id.inpURL);
        Button btnClear = (Button) findViewById(R.id.btnClear);
        Button btnPaste = (Button) findViewById(R.id.btnPaste);
        Button btnGetLink = (Button) findViewById(R.id.btnGetLink);
        statusBar = (TextView) findViewById(R.id.statusBar);
        clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);

        btnClear.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                inpURL.setText("");
                statusBar.setText("");
                videoURL = "";
            }
        });
        btnPaste.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                ClipData clip = clipboard.getPrimaryClip();
                if (clip == null || clip.getItemCount() == 0) {
                    return;
                }
                Integer index = 0;
                ClipData.Item item = clip.getItemAt(index);
                String text = item.getText().toString();
                inpURL.setText(text);
            }
        });
        btnGetLink.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                videoURL = "";
                getLink(inpURL.getText().toString());
            }
        });

        Intent intent = getIntent();
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                handleSendText(intent); // Handle text being sent
            }
        }
    }

    private void openURL() {
        if (videoURL.length() == 0) {
            writeInStatus("URL is empty!");
            return;
        }
        Intent intent = new Intent();
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        intent.setAction(android.content.Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.parse(videoURL), "video/*.*");
        startActivity(intent);
    }

    private void handleSendText(Intent intent) {
        final String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (sharedText == null || onOpenText.equals(sharedText)) {
            return;
        }
        onOpenText = sharedText;
        inpURL.setText(sharedText);
        runOnUiThread(new Runnable() {
            public void run() {
                getLink(sharedText);
            }
        });
    }

    private void getLink(String url) {
        url = url.replaceAll("\r?\n", " ");
        if (debug && url.length() == 0) {
            // url = "http://www.youtube.com/embed/VKPuXh9AKdg?wmode=opaque";
            url = "https://www.youtube.com/watch?v=uAPZa6fOC_g";
        }
        String id = getYouTubeID(url);
        if (id.length() == 0) {
            writeInStatus("Can't get video ID from link!");
            return;
        }
        if (debug) {
            Log.d("getLink", "ID:" + id);
        }
        GetYouTubeVideoLink(id);
    }

    private void GetYouTubeVideoLink(String id) {
        try {
            id = URLEncoder.encode(id, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            writeInStatus("Bad video id!");
            return;
        }
        YT_TryGetMeta(id);
    }

    private void YT_TryGetMeta(final String id) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                writeInStatus("Request video info");
                if (debug) {
                    Log.d("YT_TryGetMeta", "Request video info");
                }

                final String eurl = "http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D" + id;
                final String url = "http://www.youtube.com/get_video_info?&video_id=" + id + "&asv=3&eurl=" + eurl + "&el=info";
                try {
                    YT_GetMeta(url);
                } catch (Exception e) {
                    writeInStatus("Get video info error! " + e.getMessage());
                    if (debug) {
                        Log.d("YT_TryGetMeta", "Get video info error! " + e.toString());
                    }
                }
            }
        }).start();
    }

    private void YT_GetMeta(final String urlString) throws Exception {
        StringBuffer contentBuffer = new StringBuffer("");

        URL url = new URL(urlString);
        HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
        try {
            InputStream in = urlConnection.getInputStream();
            BufferedReader rd = new BufferedReader(new InputStreamReader(in));

            String line = "";
            do {
                line = rd.readLine();
                if (line == null) {
                    break;
                }
                contentBuffer.append(line);
            } while (true);
        } finally {
            urlConnection.disconnect();
        }

        Boolean hasLinks = YT_ReadCode(contentBuffer.toString());
        if (!hasLinks) {
            throw new Exception("Links is not found!");
        }
    }

    private Object YT_ReadInfo(String[] arr) {
        JSONObject obj = new JSONObject();
        List<String> keys = new ArrayList<String>();
        List<String> keys2 = new ArrayList<String>();
        for (String item : arr) {
            Integer pos = item.indexOf("=");
            if (pos == -1 && arr.length == 1) {
                return item;
            }
            String key = "";
            if (pos >= 0) {
                key = item.substring(0, pos);
            }
            Boolean is_obj = Boolean.TRUE;
            if (keys.indexOf(key) == -1) {
                keys.add(key);
            } else {
                if (keys2.indexOf(key) == -1) {
                    try {
                        JSONArray val = new JSONArray();
                        val.put(obj.getString(key));
                        obj.put(key, val);
                        keys2.add(key);
                    } catch (JSONException e) {
                        Log.d("YT_ReadInfo", "JSONException 1!");
                    }
                }
                is_obj = Boolean.FALSE;
            }
            String value = item.substring(pos + 1);
            try {
                value = URLDecoder.decode(value, "UTF-8");
            } catch (UnsupportedEncodingException e) {
                Log.d("YT_ReadInfo", "UnsupportedCharsetException!");
            }
            try {
                if (is_obj) {
                    obj.put(key, value);
                } else {
                    JSONArray val = obj.getJSONArray(key);
                    val.put(value);
                    obj.put(key, val);
                }
            } catch (JSONException e) {
                Log.d("YT_ReadInfo", "JSONException 4!");
            }
        }
        return obj;
    }

    private Boolean YT_ReadCode(String code) {
        String[] arr = code.replaceAll("[?&]?([^&]*)", "&$1").split("&");
        JSONObject obj = new JSONObject();
        try {
            obj.put("content", YT_ReadInfo(arr));
            obj = obj.getJSONObject("content");
        } catch (JSONException e) {
            Log.d("YT_ReadCode", "JSONException content!");
        }
        if (!obj.has("token")) {
            if (debug) {
                Log.d("YT_ReadCode", "No token!");
            }
            return Boolean.FALSE;
        }
        if (obj.has("ypc_video_rental_bar_text") && !obj.has("author")) {
            if (debug) {
                Log.d("YT_ReadCode", "rental video!");
            }
            return Boolean.FALSE;
        }
        try {
            String videos = "";
            if (obj.has("url_encoded_fmt_stream_map")) {
                videos += obj.getString("url_encoded_fmt_stream_map").trim();
            }
            if (obj.has("adaptive_fmts")) {
                if (videos.length() != 0) {
                    videos += ",";
                }
                videos += obj.getString("adaptive_fmts").trim();
            }
            String[] video_arr = videos.split(",");
            JSONObject video_obj = new JSONObject();
            video_obj.put("itag", new JSONArray());
            video_obj.put("url", new JSONArray());
            for (String item : video_arr) {
                String[] new_arr = item.replaceAll("[?&]?([^&]*)", "&$1").split("&");
                JSONObject new_obj = new JSONObject();
                new_obj.put("content", YT_ReadInfo(new_arr));
                new_obj = new_obj.getJSONObject("content");
                if (!new_obj.has("itag") || !new_obj.has("url")) {
                    continue;
                }
                if (new_obj.has("s")) {
                    writeInStatus("Signature is encrypted!");
                    continue;
                }
                String n_url = new_obj.getString("url").trim();
                if (new_obj.has("sig")) {
                    n_url += "&signature=" + new_obj.getString("sig").trim();
                }
                if (!n_url.contains("signature=")) {
                    continue;
                }
                new_obj.put("url", n_url);
                JSONArray n_it = video_obj.getJSONArray("itag");
                n_it.put(new_obj.getString("itag"));
                video_obj.put("itag", n_it);
                JSONArray n_ur = video_obj.getJSONArray("url");
                n_ur.put(new_obj.getString("url"));
                video_obj.put("url", n_ur);
            }
            obj.put("url_encoded_fmt_stream_map", video_obj);
        } catch (JSONException e) {
            Log.d("YT_ReadCode", "JSONException videos!");
        }
        JSONArray linkList = new JSONArray();
        try {
            if (obj.has("url_encoded_fmt_stream_map")) {
                JSONObject item = obj.getJSONObject("url_encoded_fmt_stream_map");
                JSONArray urlList = new JSONArray();
                JSONArray itagList = new JSONArray();
                if (item.getString("url").trim().substring(0, 1).equals("[") == Boolean.FALSE) {
                    urlList.put(item.getString("url").trim());
                } else {
                    urlList = item.getJSONArray("url");
                }
                if (item.getString("itag").trim().substring(0, 1).equals("[") == Boolean.FALSE) {
                    itagList.put(item.getString("itag").trim());
                } else {
                    itagList = item.getJSONArray("itag");
                }
                for (Integer i = 0; i < urlList.length(); i++) {
                    try {
                        JSONObject video = new JSONObject();
                        String url = urlList.getString(i).trim();
                        if (!url.contains("ratebypass")) {
                            url += "&ratebypass=yes";
                        }
                        video.put("url", url);
                        video.put("itag", itagList.getString(i));
                        linkList.put(video);
                    } catch (JSONException e) {
                        Log.d("YT_ReadCode", "JSONException 2!");
                    }
                }
            }
        } catch (JSONException e) {
            Log.d("YT_ReadCode", "JSONException p!");
        }
        Boolean lower = Boolean.TRUE;
        if (debug) {
            try {
                for (Integer i = 0; i < linkList.length(); i++) {
                    JSONObject item = linkList.getJSONObject(i);
                    Log.d("YT_ReadCode", "quality list: "+item.getString("itag"));
                }
            } catch (JSONException e) {
                Log.d("YT_ReadCode", "JSONException debug!");
            }
        }
        if (lower) { //1080
            String[] itags = {"37", "46", "96"};
            try {
                for (Integer i = 0; i < linkList.length(); i++) {
                    JSONObject item = linkList.getJSONObject(i);
                    for (String sub_item : itags) {
                        if (sub_item.equals(item.getString("itag"))) {
                            if (debug) {
                                Log.d("YT_ReadCode", "quality is "+sub_item);
                            }
                            writeInStatus("Found 1080p!");
                            onGetVideoURL(item.getString("url"));
                            return Boolean.TRUE;
                        }
                    }
                }
            } catch (JSONException e) {
                Log.d("YT_ReadCode", "JSONException 1080p!");
            }
            lower = Boolean.TRUE;
        }
        if (lower) { // 720
            String[] itags = {"22", "45", "95", "120"};
            try {
                for (Integer i = 0; i < linkList.length(); i++) {
                    JSONObject item = linkList.getJSONObject(i);
                    for (String sub_item : itags) {
                        if (sub_item.equals(item.getString("itag"))) {
                            if (debug) {
                                Log.d("YT_ReadCode", "quality is "+sub_item);
                            }
                            writeInStatus("Found 720p!");
                            onGetVideoURL(item.getString("url"));
                            return Boolean.TRUE;
                        }
                    }
                }
            } catch (JSONException e) {
                Log.d("YT_ReadCode", "JSONException 720p!");
            }
            lower = Boolean.TRUE;
        }
        if (lower) {
            String[] itags = {"35", "44", "94", "34", "43", "93", "18", "92"};
            try {
                for (Integer i = 0; i < linkList.length(); i++) {
                    JSONObject item = linkList.getJSONObject(i);
                    for (String sub_item : itags) {
                        if (sub_item.equals(item.getString("itag"))) {
                            if (debug) {
                                Log.d("YT_ReadCode", "quality is "+sub_item);
                            }
                            writeInStatus("Found 480p!");
                            onGetVideoURL(item.getString("url"));
                            return Boolean.TRUE;
                        }
                    }
                }
            } catch (JSONException e) {
                Log.d("YT_ReadCode", "JSONException 480p!");
            }
        }
        writeInStatus("Video not found!");
        return Boolean.FALSE;
    }

    private void onGetVideoURL(String url) {
        videoURL = url;
        if (runOnFound) {
            openURL();
        }
    }

    private String getYouTubeID(String url) {
        if (!url.contains( "youtu" ) && !url.contains( "google" )) {
            return "";
        }
        Boolean fail = Boolean.FALSE;
        url = url.replace("/embed/","/?v=");
        String pattern = ".*youtu.*[?|&]v=([^&?]*).*";
        String id = url.replaceAll(pattern, "$1");
        if (id.equals(url)) fail = Boolean.TRUE;
        if (fail) {
            fail = Boolean.FALSE;
            pattern = ".*plus.google.*&ytl=([^&]*).*";
            id = url.replaceAll(pattern, "$1");
            if (id.equals(url)) fail = Boolean.TRUE;
        }
        if (fail) {
            fail = Boolean.FALSE;
            pattern = ".*youtu.be/([^&]*).*";
            id = url.replaceAll(pattern, "$1");
            if (id.equals(url)) fail = Boolean.TRUE;
        }
        if (fail) {
            return "";
        }
        return id;
    }

    private void writeInStatus(final String text) {
        runOnUiThread(new Runnable() {
            public void run() {
                statusBar.setText(text);
            }
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);

        menu.clear();

        return true;
    }

}
