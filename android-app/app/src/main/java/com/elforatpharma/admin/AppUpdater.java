package com.elforatpharma.admin;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public final class AppUpdater {
    private AppUpdater() {}

    private static AlertDialog progressDialog;
    private static ProgressBar progressBar;
    private static TextView progressTitle;
    private static TextView progressPercent;
    private static TextView progressMessage;

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
                StringBuilder json = new StringBuilder();
                byte[] buffer = new byte[4096];
                int n;
                while ((n = in.read(buffer)) != -1) {
                    json.append(new String(buffer, 0, n, "UTF-8"));
                }
                in.close();
                c.disconnect();

                JSONObject release = new JSONObject(json.toString());
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
        } catch (Exception ignored) {
        }
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
        logo.setImageResource(R.drawable.launcher_logo);
        logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        LinearLayout.LayoutParams logoLp =
                new LinearLayout.LayoutParams(dp(context, 88), dp(context, 72));
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
        LinearLayout.LayoutParams subLp =
                new LinearLayout.LayoutParams(-1, dp(context, 38));
        subLp.bottomMargin = dp(context, 12);
        card.addView(subtitle, subLp);

        TextView versionView = new TextView(context);
        versionView.setText("الإصدار الجديد  " + version);
        versionView.setTextColor(Color.rgb(77, 60, 235));
        versionView.setTextSize(13);
        versionView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        versionView.setGravity(Gravity.CENTER);
        versionView.setBackground(
                rounded(Color.rgb(245, 243, 255), dp(context, 40)));
        card.addView(versionView, new LinearLayout.LayoutParams(-1, dp(context, 42)));

        TextView message = new TextView(context);
        message.setText("سيتم تنزيل التحديث داخل التطبيق ثم تثبيته تلقائيًا.\nلن تحتاج إلى حذف التطبيق.");
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

        LinearLayout.LayoutParams buttonLp =
                new LinearLayout.LayoutParams(0, dp(context, 54), 1f);
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
            startInAppDownload(context, apkUrl, version);
        });

        dialog.show();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
            dialog.getWindow().setDimAmount(0.38f);
            dialog.getWindow().setLayout(dp(context, 350), -2);
        }
    }

    private static void startInAppDownload(Context context, String apkUrl, String version) {
        showProgressDialog(context, version);

        new Thread(() -> {
            File apkFile = new File(
                    context.getExternalFilesDir("updates"),
                    "Elforat-Pharma-Admin-" + version + ".apk");

            try {
                File parent = apkFile.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) {
                    throw new Exception("Could not create update directory");
                }

                if (apkFile.exists() && !apkFile.delete()) {
                    throw new Exception("Could not replace old update file");
                }

                HttpURLConnection connection =
                        (HttpURLConnection) new URL(apkUrl).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setRequestProperty("User-Agent", "Elforat-Pharma-Admin");
                connection.setRequestProperty("Accept", "application/vnd.android.package-archive");
                connection.connect();

                int responseCode = connection.getResponseCode();
                if (responseCode < 200 || responseCode >= 300) {
                    throw new Exception("Download HTTP " + responseCode);
                }

                long total = connection.getContentLengthLong();
                long downloaded = 0;

                try (InputStream input = new BufferedInputStream(connection.getInputStream());
                     FileOutputStream output = new FileOutputStream(apkFile)) {

                    byte[] buffer = new byte[16 * 1024];
                    int count;

                    while ((count = input.read(buffer)) != -1) {
                        output.write(buffer, 0, count);
                        downloaded += count;

                        if (total > 0) {
                            int percent = (int) ((downloaded * 100L) / total);
                            updateProgress(context, percent,
                                    "جاري تنزيل التحديث...");
                        }
                    }

                    output.flush();
                } finally {
                    connection.disconnect();
                }

                updateProgress(context, 100, "اكتمل تحميل التحديث");
                new Handler(context.getMainLooper()).postDelayed(
                        () -> beginInstall(context, apkFile), 700);

            } catch (Exception e) {
                if (apkFile.exists()) apkFile.delete();

                new Handler(context.getMainLooper()).post(() -> {
                    dismissProgressDialog();
                    Toast.makeText(context,
                            "تعذر تحميل التحديث. حاول مرة أخرى.",
                            Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    private static void showProgressDialog(Context context, String version) {
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(context, 26), dp(context, 28), dp(context, 26), dp(context, 26));
        card.setBackground(rounded(Color.WHITE, dp(context, 30)));

        ImageView logo = new ImageView(context);
        logo.setImageResource(R.drawable.launcher_logo);
        logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        card.addView(logo, new LinearLayout.LayoutParams(dp(context, 82), dp(context, 66)));

        progressTitle = new TextView(context);
        progressTitle.setText("جاري تحديث التطبيق");
        progressTitle.setTextColor(Color.rgb(30, 41, 59));
        progressTitle.setTextSize(21);
        progressTitle.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        progressTitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleLp =
                new LinearLayout.LayoutParams(-1, dp(context, 38));
        titleLp.bottomMargin = dp(context, 8);
        card.addView(progressTitle, titleLp);

        TextView versionView = new TextView(context);
        versionView.setText("الإصدار الجديد  " + version);
        versionView.setTextColor(Color.rgb(77, 60, 235));
        versionView.setTextSize(13);
        versionView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        versionView.setGravity(Gravity.CENTER);
        versionView.setBackground(
                rounded(Color.rgb(245, 243, 255), dp(context, 40)));
        card.addView(versionView, new LinearLayout.LayoutParams(-1, dp(context, 40)));

        progressBar = new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        progressBar.setIndeterminate(false);
        LinearLayout.LayoutParams progressLp =
                new LinearLayout.LayoutParams(-1, dp(context, 14));
        progressLp.topMargin = dp(context, 24);
        progressLp.bottomMargin = dp(context, 14);
        card.addView(progressBar, progressLp);

        progressPercent = new TextView(context);
        progressPercent.setText("0%");
        progressPercent.setTextColor(Color.rgb(77, 60, 235));
        progressPercent.setTextSize(24);
        progressPercent.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        progressPercent.setGravity(Gravity.CENTER);
        card.addView(progressPercent, new LinearLayout.LayoutParams(-1, dp(context, 40)));

        progressMessage = new TextView(context);
        progressMessage.setText("جاري تنزيل التحديث...");
        progressMessage.setTextColor(Color.rgb(100, 116, 139));
        progressMessage.setTextSize(13);
        progressMessage.setGravity(Gravity.CENTER);
        card.addView(progressMessage, new LinearLayout.LayoutParams(-1, dp(context, 42)));

        AlertDialog dialog = new AlertDialog.Builder(context)
                .setView(card)
                .setCancelable(false)
                .create();

        progressDialog = dialog;
        dialog.show();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
            dialog.getWindow().setDimAmount(0.38f);
            dialog.getWindow().setLayout(dp(context, 350), -2);
        }
    }

    private static void updateProgress(Context context, int percent, String message) {
        new Handler(context.getMainLooper()).post(() -> {
            if (progressBar != null) progressBar.setProgress(percent);
            if (progressPercent != null) progressPercent.setText(percent + "%");
            if (progressMessage != null) progressMessage.setText(message);
        });
    }

    private static void beginInstall(Context context, File apkFile) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !context.getPackageManager().canRequestPackageInstalls()) {

            if (progressTitle != null) {
                progressTitle.setText("جارٍ تجهيز تثبيت التحديث");
            }
            if (progressMessage != null) {
                progressMessage.setText("اسمح بالتثبيت من هذا المصدر مرة واحدة.");
            }

            new AlertDialog.Builder(context)
                    .setTitle("السماح بتثبيت التحديث")
                    .setMessage("اسمح للتطبيق بتثبيت التحديثات من هذا المصدر مرة واحدة، ثم ارجع للتطبيق لإكمال التثبيت.")
                    .setNegativeButton("إلغاء", (d, w) -> dismissProgressDialog())
                    .setPositiveButton("فتح الإعدادات", (d, w) -> {
                        context.startActivity(new Intent(
                                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + context.getPackageName())));
                    })
                    .show();
            return;
        }

        if (progressTitle != null) progressTitle.setText("جارٍ تثبيت التحديث...");
        if (progressMessage != null) progressMessage.setText("سيتم إعادة تشغيل التطبيق تلقائيًا بعد اكتمال التثبيت.");

        new Handler(context.getMainLooper()).postDelayed(() -> {
            try {
                Uri installUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        apkFile);

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(
                        installUri,
                        "application/vnd.android.package-archive");
                intent.addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                                | Intent.FLAG_ACTIVITY_NEW_TASK);

                context.startActivity(intent);
            } catch (Exception e) {
                dismissProgressDialog();
                Toast.makeText(context,
                        "تعذر بدء تثبيت التحديث.",
                        Toast.LENGTH_LONG).show();
            }
        }, 800);
    }

    private static void dismissProgressDialog() {
        if (progressDialog != null && progressDialog.isShowing()) {
            progressDialog.dismiss();
        }
        progressDialog = null;
        progressBar = null;
        progressTitle = null;
        progressPercent = null;
        progressMessage = null;
    }
}
