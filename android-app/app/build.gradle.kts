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
        versionCode = 2
        versionName = "1.1.0"
    }

    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = false
        }
    }
}
