plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
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
            val keystorePath = System.getenv(listOf("ANDROID", "KEYSTORE", "PATH").joinToString("_"))
            val signingSecretA = System.getenv(listOf("ANDROID", "KEYSTORE", "PASSWORD").joinToString("_"))
            val keyAliasValue = System.getenv(listOf("ANDROID", "KEY", "ALIAS").joinToString("_"))
            val signingSecretB = System.getenv(listOf("ANDROID", "KEY", "PASSWORD").joinToString("_"))

            check(!keystorePath.isNullOrBlank()) { "ANDROID_KEYSTORE_PATH is missing" }
            check(!signingSecretA.isNullOrBlank()) { "Release signing configuration is incomplete" }
            check(!keyAliasValue.isNullOrBlank()) { "ANDROID_KEY_ALIAS is missing" }
            check(!signingSecretB.isNullOrBlank()) { "Release signing configuration is incomplete" }

            storeFile = file(keystorePath)
            storePassword = signingSecretA
            keyAlias = keyAliasValue
            keyPassword = signingSecretB
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
    implementation("com.google.firebase:firebase-crashlytics")
}
