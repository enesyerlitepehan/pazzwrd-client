import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

type ToastProps = { message: string; visible: boolean };

// TODO remove that.
const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  const [showToast, setShowToast] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 2000); // Display for 2 seconds
    }
  }, [visible]);

  if (!showToast) {
    return null;
  }

  return (
    <View style={styles.toastContainer}>
      <Text style={styles.toastMessage}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  toastMessage: {
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#fff",
    padding: 10,
    borderRadius: 5,
  },
});

export default Toast;
