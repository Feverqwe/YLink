package com.fever.ylink;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.util.Log;
import android.view.Menu;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {

    private TextView inpURL = null;
    private Button btnClear = null;
    private Button btnPaste = null;
    private Button btnOpen = null;
    private Button btnGetLink = null;
    private CheckBox inClipboard = null;
    private RadioGroup maxQuality = null;
    private CharSequence quality = null;
    private TextView statusBar = null;
    private ClipboardManager clipboard = null;
    private Boolean debug = Boolean.FALSE;
    private String videoURL = "";
    private SharedPreferences preferences = null;
    private SharedPreferences.Editor editor = null;
    private Boolean runOnFound = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        preferences = PreferenceManager.getDefaultSharedPreferences(getApplicationContext());
        editor = preferences.edit();

        inpURL = (TextView) findViewById(R.id.inpURL);
        btnClear = (Button) findViewById(R.id.btnClear);
        btnPaste = (Button) findViewById(R.id.btnPaste);
        btnOpen = (Button) findViewById(R.id.btnOpen);
        btnGetLink = (Button) findViewById(R.id.btnGetLink);
        maxQuality = (RadioGroup) findViewById(R.id.mq);
        statusBar = (TextView) findViewById(R.id.statusBar);
        clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        inClipboard = (CheckBox) findViewById(R.id.inBuffer);

        inClipboard.setChecked(preferences.getBoolean("inClipboard", Boolean.FALSE));

        quality = preferences.getString("quality", "720p");
        for (Integer i = 0; i < maxQuality.getChildCount(); i++) {
            Integer id = maxQuality.getChildAt(i).getId();
            RadioButton rb = (RadioButton) findViewById(id);
            if (rb.getText().equals(quality)) {
                rb.setChecked(Boolean.TRUE);
            }
        }
        inClipboard.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                editor.putBoolean("inClipboard", b); // value to store
                editor.commit();
            }
        });
        maxQuality.setOnCheckedChangeListener(new RadioGroup.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(RadioGroup radioGroup, int i) {
                RadioButton checked = (RadioButton) findViewById(i);
                editor.putString("quality", checked.getText().toString()); // value to store
                editor.commit();
            }
        });
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
                if (clip.getItemCount() > 0) {
                    inpURL.setText(clip.getItemAt(0).getText());
                }
            }
        });
        btnGetLink.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                RadioButton checked = (RadioButton) findViewById(maxQuality.getCheckedRadioButtonId());
                quality = checked.getText();
                videoURL = "";
                getLink(inpURL.getText().toString());
            }
        });
        btnOpen.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                openURL();
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
        intent.setAction(android.content.Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.parse(videoURL), "video/*");
        startActivity(intent);
    }

    private void handleSendText(Intent intent) {
        final String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (sharedText == null || runOnFound != null) {
            return;
        }
        inpURL.setText(sharedText);
        runOnUiThread(new Runnable() {
            public void run() {
                runOnFound = Boolean.TRUE;
                getLink(sharedText);
            }
        });
    }

    private void getLink(String url) {
        if (debug && url.length() == 0) {
            //url = "http://www.youtube.com/watch?v=SIEG0NMYbjE";
            url = "http://video.yandex.ru/users/yacinema/view/287/";
        }
        String id = getYouTubeID(url);
        Integer type = 1;
        if (id.length() == 0) {
            id = getYandexVideoID(url);
            type = 2;
        }
        Log.d("id", id);
        if (id.length() == 0) {
            writeInStatus("Can't get video ID from link!");
            return;
        }
        if (type == 1) {
            GetYouTubeVideoLink(id);
        } else if (type == 2) {
            GetYandex(id, url);
        }
    }

    private void GetYandex(final String username, String url) {
        try {
            url = "http://video.yandex.ru/oembed.xml?url=" + URLEncoder.encode(url, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            Log.d("GetYandex", "UnsupportedEncodingException!");
        }
        final String get_url = url;
        Thread myThread = new Thread(new Runnable() {
            @Override
            public void run() {
                HttpClient client = new DefaultHttpClient();
                HttpGet request = new HttpGet(get_url);
                String line = "";
                try {
                    HttpResponse response = client.execute(request);
                    HttpEntity entity = response.getEntity();
                    line = EntityUtils.toString(entity);
                } catch (IOException e) {
                    writeInStatus("Can't get video id!");
                    return;
                }
                String pattern = ".*/" + username + "/([^.]*).([0-9]*)/.*";
                String video_id = line.replace("\n", "").replaceAll(pattern, "$1.$2");
                if (video_id.length() > 0 & !video_id.equals(line)) {
                    YA_getToken(username, video_id);
                }
            }
        });
        myThread.start();
    }

    private void YA_getToken(final String username, final String video_id) {
        String url = "http://static.video.yandex.net/get-token/" + username + "/" + video_id + "/";
        HttpClient client = new DefaultHttpClient();
        HttpGet request = new HttpGet(url);
        String line = "";
        try {
            HttpResponse response = client.execute(request);
            HttpEntity entity = response.getEntity();
            line = EntityUtils.toString(entity);
        } catch (IOException e) {
            writeInStatus("Can't get token!");
            return;
        }
        String pattern = "<token>(.*)</token>";
        String token = line.replace("\n", "").replaceAll(pattern, "$1");
        if (token.length() > 0 & !token.equals(line)) {
            String videoQuality = "m1280x720";
            if (quality.equals("480p")) {
                videoQuality = "m450x334";
            }
            String get_v_link_url = "http://streaming.video.yandex.ru/get-location/" + username + "/" + video_id + "/" + videoQuality + ".mp4?token=" + token;
            String line_gvl = "";
            try {
                HttpGet request_gvl = new HttpGet(get_v_link_url);
                HttpResponse response_gvl = client.execute(request_gvl);
                HttpEntity entity_gvl = response_gvl.getEntity();
                line_gvl = EntityUtils.toString(entity_gvl);
            } catch (IOException e) {
                writeInStatus("Can't get video location!");
                return;
            }
            String pattern_gvl = "<video-location>(.*)</video-location>";
            line_gvl = line_gvl.replace("\n", "").replace("&amp;", "&").replaceAll(pattern_gvl, "$1");
            videoURL = line_gvl;
            addInClipboard(videoURL);
            writeInStatus("Found Yandex video!");
        }
    }

    private void GetYouTubeVideoLink(String id) {
        YT_TryGetMeta(id, -1);
    }

    private void YT_TryGetMeta(String id, Integer num) {
        num += 1;
        String[] type_page = {"spec", "&el=detailpage", "&el=vevo", "&el=embedded", ""};
        if (num >= type_page.length) {
            writeInStatus("Can't get meta info!");
            return;
        }
        writeInStatus("Try get meta info! #" + num.toString());
        if (debug) {
            Log.d("YT_TryGetMeta", "Try get meta info! #" + num.toString());
        }
        if (num == 0) {
            String url = "";
            try {
                url = "http://www.youtube.com/get_video_info?video_id=" + id + "&el=embedded&gl=US&hl=en&eurl=" + URLEncoder.encode("https://youtube.googleapis.com/v/" + id, "UTF-8") + "&asv=3&sts=1588";
            } catch (java.io.UnsupportedEncodingException e) {
                if (debug) {
                    Log.d("YT_TryGetMeta", "Error encode! #" + num.toString());
                }
                YT_TryGetMeta(id, num);
                return;
            }
            YT_GetMeta(url, id, num);
        } else {
            String url = "http://www.youtube.com/get_video_info?&video_id=" + id + type_page[num] + "&ps=default&eurl=&gl=US&hl=en";
            YT_GetMeta(url, id, num);
        }
    }

    private void YT_GetMeta(final String getURL, final String id, final Integer num) {
        Thread myThread = new Thread(new Runnable() {
            @Override
            public void run() {
                HttpClient client = new DefaultHttpClient();
                HttpGet request = new HttpGet(getURL);
                HttpResponse response = null;
                try {
                    response = client.execute(request);
                } catch (IOException e) {
                    if (debug) {
                        Log.d("YT_GetMeta", "Error get " + getURL);
                    }
                    YT_TryGetMeta(id, num);
                    return;
                }
                HttpEntity entity = response.getEntity();
                String line = "";
                try {
                    line = EntityUtils.toString(entity, "UTF-8");
                } catch (IOException e) {
                    if (debug) {
                        Log.d("YT_GetMeta", "Encode to UTF-8 error!");
                    }
                    YT_TryGetMeta(id, num);
                    return;
                }
                if (!YT_ReadCode(line)) {
                    YT_TryGetMeta(id, num);
                }
            }
        });
        myThread.start();
    }

    private Object YT_ReadInfo(String[] arr) {
        JSONObject obj = new JSONObject();
        List<String> keys = new ArrayList<String>();
        List<String> keys2 = new ArrayList<String>();
        for (Integer i = 0; i < arr.length; i++) {
            String item = arr[i];
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
                        String val = obj.getString(key);
                        JSONArray new_val = new JSONArray();
                        new_val.put(val);
                        obj.put(key, new_val);
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
            String[] val_arr = value.replaceAll("[?&]{1}?([^&]*)", "&$1").split("&");
            try {
                if (is_obj) {
                    if (key.equals("url") || key.equals("ttsurl")) {
                        obj.put(key, value);
                    } else if (val_arr.length == 1) {
                        obj.put(key, val_arr[0]);
                    } else {
                        Object val = YT_ReadInfo(val_arr);
                        obj.put(key, val);
                    }
                } else {
                    JSONArray val = obj.getJSONArray(key);
                    if (key.equals("url") || key.equals("ttsurl")) {
                        val.put(value);
                        obj.put(key, val);
                    } else if (val_arr.length == 1) {
                        val.put(val_arr[0]);
                        obj.put(key, val);
                    } else {
                        Object new_val = YT_ReadInfo(val_arr);
                        val.put(new_val);
                        obj.put(key, val);
                    }
                }
            } catch (JSONException e) {
                Log.d("YT_ReadInfo", "JSONException 4!");
            }
        }
        return obj;
    }

    private Boolean YT_ReadCode(String code) {
        String[] arr = code.replaceAll("[?&]{1}?([^&]*)", "&$1").split("&");
        JSONObject obj = new JSONObject();
        try {
            obj.put("content", YT_ReadInfo(arr));
            obj = obj.getJSONObject("content");

        } catch (JSONException e) {
            Log.d("YT_ReadCode", "JSONException content!");
        }
        if (!obj.has("token")) {
            Log.d("YT_ReadCode", "No token!");
            return Boolean.FALSE;
        }
        if (obj.has("ypc_video_rental_bar_text") && !obj.has("author")) {
            Log.d("YT_ReadCode", "rental video!");
            return Boolean.FALSE;
        }
        JSONArray linkList = new JSONArray();
        try {
            if (obj.has("adaptive_fmts")) {
                JSONObject item = obj.getJSONObject("adaptive_fmts");
                if (item.has("s") == Boolean.FALSE) {
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
                            String url = urlList.getString(i).trim().replaceAll(",[^&]*","");
                            if (!url.contains("ratebypass")) {
                                url += "&ratebypass=yes";
                            }
                            video.put("url", url);
                            video.put("itag", itagList.getString(i));
                            linkList.put(video);
                        } catch (JSONException e) {
                            Log.d("YT_ReadCode", "JSONException 1!");
                        }
                    }
                }
            }
        } catch (JSONException e) {
            Log.d("YT_ReadCode", "JSONException p1!");
        }
        try {
            if (obj.has("url_encoded_fmt_stream_map")) {
                JSONObject item = obj.getJSONObject("url_encoded_fmt_stream_map");
                if (item.has("s") == Boolean.FALSE) {
                    JSONArray urlList = new JSONArray();
                    JSONArray sigList = new JSONArray();
                    JSONArray itagList = new JSONArray();
                    if (item.getString("url").trim().substring(0, 1).equals("[") == Boolean.FALSE) {
                        urlList.put(item.getString("url").trim());
                    } else {
                        urlList = item.getJSONArray("url");
                    }
                    if (item.getString("sig").trim().substring(0, 1).equals("[") == Boolean.FALSE) {
                        sigList.put(item.getString("sig").trim());
                    } else {
                        sigList = item.getJSONArray("sig");
                    }
                    if (item.getString("itag").trim().substring(0, 1).equals("[") == Boolean.FALSE) {
                        itagList.put(item.getString("itag").trim());
                    } else {
                        itagList = item.getJSONArray("itag");
                    }
                    for (Integer i = 0; i < urlList.length(); i++) {
                        try {
                            JSONObject video = new JSONObject();
                            String url = urlList.getString(i).trim() + "&signature=" + sigList.getString(i).trim();
                            if (!url.contains("ratebypass")) {
                                url += "&ratebypass=yes";
                            }
                            url = url.replaceAll(",[^&]*","");
                            video.put("url", url);
                            video.put("itag", itagList.getString(i));
                            linkList.put(video);
                        } catch (JSONException e) {
                            Log.d("YT_ReadCode", "JSONException 2!");
                        }
                    }
                }
            }
        } catch (JSONException e) {
            Log.d("YT_ReadCode", "JSONException p2!");
        }
        Boolean lower = Boolean.FALSE;
        if (quality.equals("1080p")) {
            String[] itags = {"37", "46"};
            try {
                for (Integer i = 0; i < linkList.length(); i++) {
                    JSONObject item = linkList.getJSONObject(i);
                    for (Integer n = 0; n < itags.length; n++) {
                        if (itags[n].equals(item.getString("itag"))) {
                            writeInStatus("Found 1080p!");
                            videoURL = item.getString("url");
                            addInClipboard(videoURL);
                            return Boolean.TRUE;
                        }
                    }
                }
            } catch (JSONException e) {
                Log.d("YT_ReadCode", "JSONException 1080p!");
            }
            lower = Boolean.TRUE;
        }
        if (quality.equals("720p") || lower) {
            String[] itags = {"22", "45"};
            try {
                for (Integer i = 0; i < linkList.length(); i++) {
                    JSONObject item = linkList.getJSONObject(i);
                    for (Integer n = 0; n < itags.length; n++) {
                        if (itags[n].equals(item.getString("itag"))) {
                            writeInStatus("Found 720p!");
                            videoURL = item.getString("url");
                            addInClipboard(videoURL);
                            return Boolean.TRUE;
                        }
                    }
                }
            } catch (JSONException e) {
                Log.d("YT_ReadCode", "JSONException 720p!");
            }
            lower = Boolean.TRUE;
        }
        if (quality.equals("480p") || lower) {
            String[] itags = {"44", "35", "34", "43", "18"};
            try {
                for (Integer i = 0; i < linkList.length(); i++) {
                    JSONObject item = linkList.getJSONObject(i);
                    for (Integer n = 0; n < itags.length; n++) {
                        if (itags[n].equals(item.getString("itag"))) {
                            writeInStatus("Found 480p!");
                            videoURL = item.getString("url");
                            addInClipboard(videoURL);
                            return Boolean.TRUE;
                        }
                    }
                }
            } catch (JSONException e) {
                Log.d("YT_ReadCode", "JSONException 480p!");
            }
        }
        if (quality.equals("Audio")) {
            String[] itags = {"141", "140", "139"};
            try {
                for (Integer i = 0; i < linkList.length(); i++) {
                    JSONObject item = linkList.getJSONObject(i);
                    for (Integer n = 0; n < itags.length; n++) {
                        if (itags[n].equals(item.getString("itag"))) {
                            writeInStatus("Found Audio!");
                            videoURL = item.getString("url");
                            addInClipboard(videoURL);
                            return Boolean.TRUE;
                        }
                    }
                }
            } catch (JSONException e) {
                Log.d("YT_ReadCode", "JSONException Audio!");
            }
        }
        writeInStatus("Video not found!");
        return Boolean.FALSE;
    }

    private void addInClipboard(String url) {
        if (inClipboard.isChecked()) {
            ClipData clip = ClipData.newPlainText("url", url);
            clipboard.setPrimaryClip(clip);
        }
        if (runOnFound) {
            runOnFound = Boolean.FALSE;
            openURL();
        }
    }

    private String getYouTubeID(String url) {
        String pattern = ".*[?|&]{1}v=([^&]*).*";
        String id = url.replaceAll(pattern, "$1");
        if (id.equals(url)) return "";
        return id;
    }

    private String getYandexVideoID(String url) {
        String pattern = ".*video.yandex.*/users/([^/]*).*";
        String id = url.replaceAll(pattern, "$1");
        if (id.equals(url)) return "";
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
