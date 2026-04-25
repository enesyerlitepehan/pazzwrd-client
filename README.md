# password

## iOS Face ID setup (Expo managed)

This project uses Expo LocalAuthentication for Face ID / biometrics.

Configuration

- NSFaceIDUsageDescription is set in `client/app.config.js` under `expo.ios.infoPlist`.
- Example value: "This app uses Face ID to authenticate you quickly and securely."

Important notes

- Expo Go does not apply your Expo app config Info.plist changes. If you run in Expo Go, LocalAuthentication may include a warning like:
  "FaceID is available but has not been configured. To enable FaceID, provide NSFaceIDUsageDescription."
- To apply Info.plist changes, you must run a native build:
  - Dev Client: npx expo run:ios (or use EAS Build: eas build --profile development --platform ios)
  - If you’ve never prebuilt: npx expo prebuild --platform ios (or use EAS Build directly)
- After changing `client/app.config.js`, rebuild the iOS app to pick up the new Info.plist.

## Client env setup

Copy `client/.env.example` to `client/.env` and set your own values before enabling Google Sign-In or RevenueCat.

Important variables

- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_RC_IOS_API_KEY`
- `EXPO_PUBLIC_RC_ANDROID_API_KEY`
- `EXPO_PUBLIC_RC_PRODUCT_PRO_MONTHLY`
- `EXPO_PUBLIC_RC_PRODUCT_PRO_YEARLY`
- `EXPO_PUBLIC_RC_PRODUCT_FAMILY_MONTHLY`
- `EXPO_PUBLIC_RC_PRODUCT_FAMILY_YEARLY`
- `EXPO_IOS_BUNDLE_IDENTIFIER`
- `EXPO_ANDROID_PACKAGE`
- `EXPO_EAS_PROJECT_ID`
- `EXPO_OWNER`

If these variables are missing, the app now falls back to safe placeholders or disables the related integration instead of pointing forks at the original production project.

`client/eas.json` no longer contains a hard-coded App Store Connect app id. If you use EAS Submit, add your own submit configuration in your local/project setup.

Testing tips

- Ensure the device supports Face ID and has it enrolled (Settings > Face ID & Passcode).
- Simulator: pick a Face ID capable simulator (e.g., iPhone 14/15) and enable Features > Face ID > Enrolled; then use Matching Face/Non-matching Face.
- authenticateAsync may return a result with a warning field in environments where Info.plist is not applied (e.g., Expo Go). In this app, we no longer log the raw result to avoid confusing console output.

Code behavior

- FaceID screen now checks for hardware support, enrollment, and that facial recognition is supported before prompting.
- The raw result object is no longer logged; only success/failure is handled.
