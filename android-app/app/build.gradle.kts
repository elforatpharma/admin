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
        versionCode = 5
        versionName = "1.4.0"
    }

    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = false
        }
    }
}


dependencies {
    implementation("androidx.core:core:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}
