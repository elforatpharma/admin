plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
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

    signingConfigs {
        create("release") {
            val keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
            val keystorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            val keyAliasValue = System.getenv("ANDROID_KEY_ALIAS")
            val keyPasswordValue = System.getenv("ANDROID_KEY_PASSWORD")

            check(!keystorePath.isNullOrBlank()) { "ANDROID_KEYSTORE_PATH is missing" }
            check(!keystorePassword.isNullOrBlank()) { "ANDROID_KEYSTORE_PASSWORD is missing" }
            check(!keyAliasValue.isNullOrBlank()) { "ANDROID_KEY_ALIAS is missing" }
            check(!keyPasswordValue.isNullOrBlank()) { "ANDROID_KEY_PASSWORD is missing" }

            storeFile = file(keystorePath)
            storePassword = keystorePassword
            keyAlias = keyAliasValue
            keyPassword = keyPasswordValue
        }
    }

    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
        }
    }
}

dependencies {
    implementation("androidx.core:core:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation(platform("com.google.firebase:firebase-bom:34.19.0"))
    implementation("com.google.firebase:firebase-messaging")
}
