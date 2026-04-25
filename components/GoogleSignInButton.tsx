import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { ActivityIndicator } from "react-native";

import { socialGoogleLogin } from "../api/api";
import { icons } from "../constants";
import { CONFIG } from "../utils/config";

import SocialButton from "./SocialButton";

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignInButton() {
  const { iosClientId, androidClientId, webClientId } = CONFIG.auth.google;
  const isGoogleSignInConfigured = !!(iosClientId && androidClientId && webClientId);
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    (async () => {
      if (response?.type === "success") {
        const idToken = response.authentication?.idToken;
        if (!idToken) return;
        // Backend doğrulama + kendi JWT’lerimizi alma
        const result = await socialGoogleLogin(idToken);
        if (!result || !result.ok) {
          // console.log("GoogleSignIn error:", result?.code);
          return;
        }
        // Success shape now (standardized):
        // { success: true, code: "GOOGLE_LOGIN_OK", message: "OK", data: { type: "PostLogin", accessToken, refreshToken, security } }
        // -> tokenları SecureStore’a yaz, AuthContext’e set et
      } else if (response?.type === "error") {
        // console.log("GoogleSignIn error response:", response.error);
      }
    })();
  }, [response]);

  if (!isGoogleSignInConfigured) return null;
  if (!request) return <ActivityIndicator />;
  return <SocialButton icon={icons.google} onPress={() => promptAsync()} />;
}
