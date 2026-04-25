import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { toastBus } from "../utils/toastBus";

interface ToastContextValue {
  show: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [message, setMessage] = useState<string>("");
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setMessage("");
    });
  }, [opacity]);

  const show = useCallback(
    (msg: string, durationMs: number = 3000) => {
      if (!msg) return;
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
      setMessage(msg);
      setVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      hideTimeout.current = setTimeout(() => hide(), durationMs);
    },
    [hide, opacity],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible && (
        <View pointerEvents="none" style={styles.container}>
          <Animated.View style={[styles.toast, { opacity }]}>
            <Text style={styles.text}>{message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

// Subscribe to global toastBus so non-React modules can trigger toasts
export const GlobalToastBridge: React.FC = () => {
  const { show } = useToast();
  useEffect(() => {
    const handler = (msg: string, ms?: number) => show(msg, ms);
    toastBus.on(handler);
    return () => toastBus.off(handler);
  }, [show]);
  return null;
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: "center",
  },
  toast: {
    maxWidth: "90%",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  text: {
    color: "#fff",
    fontSize: 14,
  },
});

export default ToastProvider;
