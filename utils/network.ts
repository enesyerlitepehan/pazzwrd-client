import NetInfo from "@react-native-community/netinfo";

// Simple network helper extracted for reuse
export async function isOffline(): Promise<boolean> {
  try {
    const net = await NetInfo.fetch();
    return net.isConnected === false || net.isInternetReachable === false;
  } catch {
    return false;
  }
}
