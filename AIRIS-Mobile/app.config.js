const { withAppBuildGradle } = require("@expo/config-plugins");

// Custom Expo Config Plugin to inject release signing configuration in build.gradle
const withAndroidReleaseSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    const releaseSigningConfig = `
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "debug.keystore")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: "android"
            keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: "androiddebugkey"
            keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: "android"
        }
`;

    // Inject release signingConfig if not already present
    if (!config.modResults.contents.includes("ANDROID_KEYSTORE_PATH")) {
      config.modResults.contents = config.modResults.contents.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {${releaseSigningConfig}`
      );
    }

    // Direct buildTypes.release to use the release signingConfig
    const buildTypesMatch = config.modResults.contents.indexOf("buildTypes {");
    if (buildTypesMatch !== -1) {
      const buildTypeReleaseMatch = config.modResults.contents.indexOf("release {", buildTypesMatch);
      if (buildTypeReleaseMatch !== -1) {
        const targetString = "signingConfig signingConfigs.debug";
        const targetIndex = config.modResults.contents.indexOf(targetString, buildTypeReleaseMatch);
        if (targetIndex !== -1) {
          config.modResults.contents =
            config.modResults.contents.substring(0, targetIndex) +
            "signingConfig signingConfigs.release" +
            config.modResults.contents.substring(targetIndex + targetString.length);
        }
      }
    }

    return config;
  });
};

module.exports = ({ config }) => {
  let updatedConfig = {
    ...config,
    android: {
      ...config.android,
      versionCode: process.env.GITHUB_RUN_NUMBER
        ? parseInt(process.env.GITHUB_RUN_NUMBER, 10)
        : (config.android?.versionCode || 1),
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ||
        config.android?.googleServicesFile ||
        "./google-services.json",
    },
  };

  // Programmatically apply the release signing plugin
  updatedConfig = withAndroidReleaseSigning(updatedConfig);

  return updatedConfig;
};
