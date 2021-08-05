package com.fever.ylink;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

public class ShareActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d("myApp", "ShareActivity onCreate");

        Intent intent = getIntent();
        String type = intent.getType();
        if (Intent.ACTION_SEND.equals(intent.getAction()) && type != null) {
            if ("text/plain".equals(type)) {
                handleSendText(intent); // Handle text being sent
            }
        }

        finish();
    }

    private void handleSendText(Intent intent) {
        final String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        intent.removeExtra(Intent.EXTRA_TEXT);

        Log.d("myApp", "handleSendText " + sharedText);

        if (sharedText != null) {
            Intent newIntent = new Intent(getBaseContext(), MainActivity.class);
            newIntent.putExtra("EXTRA_TEXT", sharedText);
            startActivity(newIntent);
        }
    }
}