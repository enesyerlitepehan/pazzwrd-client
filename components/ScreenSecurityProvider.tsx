import React, { useMemo, useContext } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { AuthContext } from "../store/auth-context";
import { useSecurity } from "../store/security-context";
import { useScreenSecurityLifecycle } from "./useScreenSecurityLifecycle";

// BlurView is optional. We'll lazy require it to avoid runtime issues if native module is missing.
let BlurView: any = null;
try {
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

export const ScreenSecurityProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { setLocked } = useSecurity();
  const { isAuthenticated } = useContext(AuthContext);

  const { showBlur } = useScreenSecurityLifecycle(isAuthenticated, setLocked);

  const overlay = useMemo(() => {
    if (!showBlur) return null;
    if (BlurView) {
      return <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />;
    }
    // Fallback: dim overlay (not a true blur, but provides obscuring effect)
    return <View style={[StyleSheet.absoluteFill, styles.dim]} />;
  }, [showBlur]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {children}
      {overlay}
    </View>
  );
};

export default ScreenSecurityProvider;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dim: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
