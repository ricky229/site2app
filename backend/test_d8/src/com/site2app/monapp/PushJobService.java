package com.site2app.monapp;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

@SuppressLint("SpecifyJobSchedulerIdRange")
public class PushJobService extends JobService {
    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL("http://10.0.2.2:4000/api/notifications/latest?appId=test_d8");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(5000);
                    
                    if (conn.getResponseCode() == 200) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        reader.close();
                        
                        JSONObject n = new JSONObject(sb.toString());
                        String id = n.optString("id", null);
                        
                        if (id != null) {
                            SharedPreferences prefs = getSharedPreferences("S2A_PREFS", MODE_PRIVATE);
                            String last = prefs.getString("s2a_last_notif", "");
                            if (!last.equals(id)) {
                                prefs.edit().putString("s2a_last_notif", id).apply();
                                showLocalPush(id, n.optString("title", "Notification"), n.optString("body", ""));
                            }
                        }
                    }
                } catch (Exception e) {}
                jobFinished(params, false);
            }
        }).start();
        return true;
    }
    
    @Override
    public boolean onStopJob(JobParameters params) { return false; }
    
    private void showLocalPush(String id, String title, String body) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel("SITE2APP_PUSH", "Push Notifications", NotificationManager.IMPORTANCE_HIGH));
        }
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent, flags);
        
        Notification.Builder nb = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
            ? new Notification.Builder(this, "SITE2APP_PUSH") 
            : new Notification.Builder(this);
            
        int iconId = getResources().getIdentifier("ic_launcher", "mipmap", getPackageName());
        nb.setContentTitle(title).setContentText(body).setSmallIcon(iconId == 0 ? android.R.drawable.ic_dialog_info : iconId)
          .setAutoCancel(true).setContentIntent(pi);
        nm.notify(id != null ? id.hashCode() : 1, nb.build());
    }
    
    public static void schedule(Context context) {
        JobScheduler js = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        JobInfo job = new JobInfo.Builder(101, new ComponentName(context, PushJobService.class))
            .setPeriodic(15 * 60 * 1000) // 15 mins
            .setPersisted(true)
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .build();
        js.schedule(job);
    }
}