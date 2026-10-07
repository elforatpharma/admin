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

    private static GradientDrawable rounded(int color, float radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radius);
        return d;
    }

    private static GradientDrawable brandButton() {
        GradientDrawable d = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{Color.rgb(77, 60, 235), Color.rgb(133, 54, 255)});
        d.setCornerRadius(60f);
        return d;
    }

    private static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private static void showDialog(Context context, String version, String apkUrl) {
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(context, 26), dp(context, 24), dp(context, 26), dp(context, 22));
        card.setBackground(rounded(Color.WHITE, dp(context, 30)));

        ImageView logo = new ImageView(context);
        logo.setImageResource(com.elforatpharma.admin.R.drawable.launcher_logo);
        logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        LinearLayout.LayoutParams logoLp = new LinearLayout.LayoutParams(dp(context, 88), dp(context, 72));
        logoLp.bottomMargin = dp(context, 8);
        card.addView(logo, logoLp);

        TextView title = new TextView(context);
        title.setText("تحديث جديد متاح");
        title.setTextColor(Color.rgb(30, 41, 59));
        title.setTextSize(22);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        card.addView(title, new LinearLayout.LayoutParams(-1, dp(context, 38)));

        TextView subtitle = new TextView(context);
        subtitle.setText("إصدار أحدث من لوحة تحكم الفرات فارما جاهز");
        subtitle.setTextColor(Color.rgb(100, 116, 139));
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(-1, dp(context, 38));
        subLp.bottomMargin = dp(context, 12);
        card.addView(subtitle, subLp);

        TextView versionView = new TextView(context);
        versionView.setText("الإصدار الجديد  " + version);
        versionView.setTextColor(Color.rgb(77, 60, 235));
        versionView.setTextSize(13);
        versionView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        versionView.setGravity(Gravity.CENTER);
        versionView.setBackground(rounded(Color.rgb(245, 243, 255), dp(context, 40)));
        card.addView(versionView, new LinearLayout.LayoutParams(-1, dp(context, 42)));

        TextView message = new TextView(context);
        message.setText("سيتم تنزيل التحديث ثم فتح الإصدار الجديد تلقائيًا.\nلن تحتاج إلى حذف التطبيق أو تثبيته من البداية.");
        message.setTextColor(Color.rgb(71, 85, 105));
        message.setTextSize(13);
        message.setGravity(Gravity.CENTER);
        message.setPadding(dp(context, 4), dp(context, 14), dp(context, 4), dp(context, 10));
        card.addView(message, new LinearLayout.LayoutParams(-1, dp(context, 74)));

        LinearLayout actions = new LinearLayout(context);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER_VERTICAL);

        TextView later = new TextView(context);
        later.setText("لاحقًا");
        later.setTextColor(Color.rgb(100, 116, 139));
        later.setTextSize(15);
        later.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        later.setGravity(Gravity.CENTER);
        later.setBackground(rounded(Color.rgb(248, 250, 252), dp(context, 22)));

        TextView update = new TextView(context);
        update.setText("تحديث الآن");
        update.setTextColor(Color.WHITE);
        update.setTextSize(15);
        update.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        update.setGravity(Gravity.CENTER);
        update.setBackground(brandButton());

        LinearLayout.LayoutParams buttonLp = new LinearLayout.LayoutParams(0, dp(context, 54), 1f);
        buttonLp.setMargins(dp(context, 4), 0, dp(context, 4), 0);
        actions.addView(later, buttonLp);
        actions.addView(update, buttonLp);
        card.addView(actions, new LinearLayout.LayoutParams(-1, dp(context, 58)));

        AlertDialog dialog = new AlertDialog.Builder(context)
                .setView(card)
                .setCancelable(false)
                .create();

        later.setOnClickListener(v -> dialog.dismiss());
        update.setOnClickListener(v -> {
            dialog.dismiss();
            download(context, apkUrl, version);
        });

        dialog.show();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
            dialog.getWindow().setDimAmount(0.38f);
            dialog.getWindow().setLayout(dp(context, 350), -2);
        }
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
