package com.elforatpharma.admin;

import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.provider.Settings;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public final class AppUpdater {
    private AppUpdater() {}

    public static void check(Context context) {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(
                        "https://api.github.com/repos/elforatpharma/admin/releases/latest").openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setRequestProperty("Accept", "application/vnd.github+json");
                c.setRequestProperty("User-Agent", "Elforat-Pharma-Admin");

                InputStream in = c.getInputStream();
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[4096];
                int n;
                while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                in.close();

                JSONObject release = new JSONObject(out.toString("UTF-8"));
                String latest = release.optString("tag_name", "").replaceFirst("^v", "").trim();
                JSONArray assets = release.optJSONArray("assets");
                String apkUrl = null;

                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject asset = assets.getJSONObject(i);
                        if (asset.optString("name", "").toLowerCase(Locale.US).endsWith(".apk")) {
                            apkUrl = asset.optString("browser_download_url", null);
                            break;
                        }
                    }
                }

                PackageInfo info = context.getPackageManager().getPackageInfo(
                        context.getPackageName(), 0);
                String current = info.versionName == null ? "0.0.0" : info.versionName;

                if (!latest.isEmpty() && apkUrl != null && newer(latest, current)) {
                    String finalUrl = apkUrl;
                    new Handler(context.getMainLooper()).post(
                            () -> showDialog(context, latest, finalUrl));
                }
            } catch (Exception ignored) {
            }
        }).start();
    }

    private static boolean newer(String remote, String local) {
        try {
            String[] a = remote.split("\\.");
            String[] b = local.split("\\.");
            int length = Math.max(a.length, b.length);
            for (int i = 0; i < length; i++) {
                int av = i < a.length ? Integer.parseInt(a[i].replaceAll("[^0-9].*", "")) : 0;
                int bv = i < b.length ? Integer.parseInt(b[i].replaceAll("[^0-9].*", "")) : 0;
                if (av != bv) return av > bv;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private static void showDialog(Context context, String version, String apkUrl) {
        new AlertDialog.Builder(context)
                .setTitle("تحديث جديد متاح")
                .setMessage("يوجد إصدار جديد من تطبيق الفرات فارما (" + version
                        + ").\n\nيمكنك تحديث التطبيق الآن بدون حذفه أو تثبيته من البداية.")
                .setCancelable(false)
                .setNegativeButton("لاحقًا", null)
                .setPositiveButton("تحديث الآن",
                        (d, w) -> download(context, apkUrl, version))
                .show();
    }

    private static void download(Context context, String apkUrl, String version) {
        try {
            DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
            request.setTitle("تحديث الفرات فارما " + version);
            request.setDescription("جاري تنزيل الإصدار الجديد...");
            request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(
                    context, Environment.DIRECTORY_DOWNLOADS,
                    "Elforat-Pharma-Admin-" + version + ".apk");

            long id = dm.enqueue(request);
            Toast.makeText(context, "جاري تنزيل التحديث...", Toast.LENGTH_LONG).show();
            monitor(context, id);
        } catch (Exception e) {
            Toast.makeText(context, "تعذر بدء تحميل التحديث.", Toast.LENGTH_LONG).show();
        }
    }

    private static void monitor(Context context, long id) {
        Handler handler = new Handler(context.getMainLooper());
        handler.postDelayed(new Runnable() {
            @Override public void run() {
                try {
                    DownloadManager dm = (DownloadManager)
                            context.getSystemService(Context.DOWNLOAD_SERVICE);
                    Cursor cursor = dm.query(new DownloadManager.Query().setFilterById(id));

                    if (cursor != null && cursor.moveToFirst()) {
                        int status = cursor.getInt(cursor.getColumnIndexOrThrow(
                                DownloadManager.COLUMN_STATUS));

                        if (status == DownloadManager.STATUS_SUCCESSFUL) {
                            String localUri = cursor.getString(cursor.getColumnIndexOrThrow(
                                    DownloadManager.COLUMN_LOCAL_URI));
                            cursor.close();
                            install(context, Uri.parse(localUri));
                            return;
                        }

                        if (status == DownloadManager.STATUS_FAILED) {
                            cursor.close();
                            Toast.makeText(context, "فشل تحميل التحديث.", Toast.LENGTH_LONG).show();
                            return;
                        }
                        cursor.close();
                    }
                } catch (Exception ignored) {}

                handler.postDelayed(this, 1000);
            }
        }, 1000);
    }

    private static void install(Context context, Uri localUri) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !context.getPackageManager().canRequestPackageInstalls()) {
                new AlertDialog.Builder(context)
                        .setTitle("السماح بالتحديث")
                        .setMessage("اسمح للتطبيق بتثبيت التحديثات من هذا المصدر مرة واحدة.")
                        .setNegativeButton("إلغاء", null)
                        .setPositiveButton("فتح الإعدادات",
                                (d, w) -> context.startActivity(new Intent(
                                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                        Uri.parse("package:" + context.getPackageName()))))
                        .show();
                return;
            }

            Uri installUri = localUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
                    && "file".equalsIgnoreCase(localUri.getScheme())) {
                installUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        new java.io.File(localUri.getPath()));
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(installUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(context,
                    "تعذر فتح ملف التحديث. يمكنك المحاولة مرة أخرى.",
                    Toast.LENGTH_LONG).show();
        }
    }
}
