package com.site2app.monapp;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.ProviderInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.File;
import java.io.FileNotFoundException;
public class AppFileProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    @Override public void attachInfo(Context context, ProviderInfo info) { super.attachInfo(context, info); }
    @Override public Cursor query(Uri uri, String[] p, String s, String[] sa, String so) { return null; }
    @Override public String getType(Uri uri) { return null; }
    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String s, String[] sa) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String s, String[] sa) { return 0; }
    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File file = new File(getContext().getCacheDir(), uri.getLastPathSegment());
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }
}