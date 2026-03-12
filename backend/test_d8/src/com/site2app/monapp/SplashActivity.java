package com.site2app.monapp;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
public class SplashActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar + nav bar color
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#1a1a2e"));
            window.setNavigationBarColor(Color.parseColor("#1a1a2e"));
        }

        // Build splash layout
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#1a1a2e"));

        // Default branded splash layout
        // Circle with app icon
        int circleSize = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 100, getResources().getDisplayMetrics());
        LinearLayout circle = new LinearLayout(this);
        circle.setGravity(Gravity.CENTER);
        GradientDrawable circleDrawable = new GradientDrawable();
        circleDrawable.setShape(GradientDrawable.OVAL);
        circleDrawable.setColor(0x44FFFFFF);
        circle.setBackground(circleDrawable);
        LinearLayout.LayoutParams circleParams = new LinearLayout.LayoutParams(circleSize, circleSize);
        circleParams.bottomMargin = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 24, getResources().getDisplayMetrics());

        // App icon inside circle
        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        int iconSize = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 56, getResources().getDisplayMetrics());
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(iconSize, iconSize);
        circle.addView(icon, iconParams);
        root.addView(circle, circleParams);

        // App name text
        TextView nameView = new TextView(this);
        nameView.setText("MonApp");
        nameView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 28);
        nameView.setTextColor(Color.WHITE);
        nameView.setTypeface(Typeface.DEFAULT_BOLD);
        nameView.setGravity(Gravity.CENTER);
        root.addView(nameView);

        // Loading text
        TextView loadingView = new TextView(this);
        loadingView.setText("Chargement...");
        loadingView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        loadingView.setTextColor(0x88FFFFFF);
        loadingView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams loadingParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        loadingParams.topMargin = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 12, getResources().getDisplayMetrics());
        root.addView(loadingView, loadingParams);

        setContentView(root);

        // Navigate to main activity after delay
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                startActivity(new Intent(SplashActivity.this, MainActivity.class));
                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                finish();
            }
        }, 2000);
    }
}