import java.util.Base64

plugins {
    id("com.android.application")
}

android {
    namespace = "com.elforatpharma.admin"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.elforatpharma.admin"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = false
        }
    }
}

val generateAppSources = tasks.register("generateAppSources") {
    doLast {
        val root = project.projectDir
        val javaDir = File(root, "src/main/java/com/elforatpharma/admin")
        val valuesDir = File(root, "src/main/res/values")
        javaDir.mkdirs()
        valuesDir.mkdirs()

        val javaCode = Base64.getDecoder().decode("cGFja2FnZSBjb20uZWxmb3JhdHBoYXJtYS5hZG1pbjsKaW1wb3J0IGFuZHJvaWQuYXBwLkFjdGl2aXR5OwppbXBvcnQgYW5kcm9pZC5vcy5CdW5kbGU7CmltcG9ydCBhbmRyb2lkLndlYmtpdC5XZWJWaWV3OwppbXBvcnQgYW5kcm9pZC53ZWJraXQuV2ViVmlld0NsaWVudDsKcHVibGljIGNsYXNzIE1haW5BY3Rpdml0eSBleHRlbmRzIEFjdGl2aXR5IHsKIHByaXZhdGUgV2ViVmlldyB3ZWJWaWV3OwogQE92ZXJyaWRlIHB1YmxpYyB2b2lkIG9uQ3JlYXRlKEJ1bmRsZSBiKXtzdXBlci5vbkNyZWF0ZShiKTtzZXRDb250ZW50VmlldyhSLmxheW91dC5hY3Rpdml0eV9tYWluKTt3ZWJWaWV3PWZpbmRWaWV3QnlJZChSLmlkLndlYnZpZXcpO3dlYlZpZXcuZ2V0U2V0dGluZ3MoKS5zZXRKYXZhU2NyaXB0RW5hYmxlZCh0cnVlKTt3ZWJWaWV3LmdldFNldHRpbmdzKCkuc2V0RG9tU3RvcmFnZUVuYWJsZWQodHJ1ZSk7d2ViVmlldy5zZXRXZWJWaWV3Q2xpZW50KG5ldyBXZWJWaWV3Q2xpZW50KCkpO3dlYlZpZXcubG9hZFVybCgiaHR0cHM6Ly9lbGZvcmF0cGhhcm1hLmdpdGh1Yi5pby9hZG1pbi8iKTt9CiBAT3ZlcnJpZGUgcHVibGljIHZvaWQgb25CYWNrUHJlc3NlZCgpe2lmKHdlYlZpZXcuY2FuR29CYWNrKCkpd2ViVmlldy5nb0JhY2soKTtlbHNlIHN1cGVyLm9uQmFja1ByZXNzZWQoKTt9Cn0=").toString(Charsets.UTF_8)
        File(javaDir, "MainActivity.java").writeText(javaCode)

        val style = "<resources><style name=\"AppTheme\" parent=\"android:style/Theme.Material.Light.NoActionBar\"><item name=\"android:colorAccent\">#4D3CEB</item><item name=\"android:navigationBarColor\">#FFFFFF</item><item name=\"android:statusBarColor\">#FFFFFF</item><item name=\"android:windowLightStatusBar\">true</item></style></resources>"
        File(valuesDir, "styles.xml").writeText(style)
    }
}

tasks.matching { it.name == "preBuild" }.configureEach {
    dependsOn(generateAppSources)
}
