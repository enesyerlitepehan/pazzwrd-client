import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import React, { useContext } from "react";

import { socialAppleLogin } from "../api/api";
import { COLORS, icons } from "../constants";
import { applyPostLogin } from "../service/SignService";
import { AuthContext } from "../store/auth-context";
import { useSecurity } from "../store/security-context";
import { useTheme } from "../theme/ThemeProvider";

import SocialButton from "./SocialButton";

export default function AppleSignInButton() {
  const { colors, dark } = useTheme();
  const authCtx = useContext(AuthContext);
  const { mpStatus: localMpStatus, setMpStatus, setAccountAccess, setEmailStatus } = useSecurity();
  const onPress = async () => {
    // Nonce üret ve SHA-256 hash’le (replay riskini azaltır)
    const rawNonce = Math.random().toString(36).slice(2);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    // Apple identityToken (JWT) döner
    const identityToken = credential.identityToken;
    if (!identityToken) return;

    const result = await socialAppleLogin(identityToken, rawNonce);
    if (!result || !result.ok) {
      // console.log("AppleSignIn error:", result?.code);
      return;
    }

    const applyResult = await applyPostLogin(result.data, authCtx, {
      localMpStatus,
      setMpStatus,
      setAccountAccess,
      setEmailStatus,
    });
    if (!applyResult.ok) {
      // console.log("AppleSignIn post-login handling failed");
    }
    // Success handled: tokens stored and security updated.
  };

  return (
    <SocialButton
      icon={icons.appleLogo}
      onPress={onPress}
      tintColor={dark ? COLORS.white : COLORS.black}
    />
  );
}
