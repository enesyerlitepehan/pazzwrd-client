import { MaterialCommunityIcons } from "@expo/vector-icons";
import Barcode from "@kichiyaki/react-native-barcode-generator";
import { NavigationProp } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-virtualized-view";

import Header from "../components/Header";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES, icons } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

// Transaction ereceipt
const ProductEReceipt = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [modalVisible, setModalVisible] = useState(false);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { colors, dark } = useTheme();

  const dropdownItems = [
    { label: "Share E-Receipt", value: "share", icon: icons.shareOutline },
    {
      label: "Download E-Receipt",
      value: "downloadEReceipt",
      icon: icons.download2,
    },
    { label: "Print", value: "print", icon: icons.documentOutline },
  ];

  const handleDropdownSelect = (item: any) => {
    setSelectedItem(item.value);
    setModalVisible(false);

    // Perform actions based on the selected item
    switch (item.value) {
      case "share":
        // Handle share action
        setModalVisible(false);
        navigation.navigate("(tabs)");
        break;
      case "downloadEReceipt":
        // Handle Download E-Receipt action
        setModalVisible(false);
        navigation.navigate("(tabs)");
        break;
      case "print":
        // Handle Print action
        setModalVisible(false);
        navigation.navigate("(tabs)");
        break;
      default:
        break;
    }
  };
  /**
   * Render header
   */
  const renderHeader = () => {
    return (
      <Header
        title="E-Receipt"
        rightIcon={icons.moreCircle}
        onRightPress={() => setModalVisible(true)}
      />
    );
  };
  /**
   * Render content
   */
  const renderContent = () => {
    const transactionId = "SKD354822747"; // Replace with your actual transaction ID

    const handleCopyToClipboard = async () => {
      await Clipboard.setStringAsync(transactionId);
      setCopyModalVisible(true);
    };

    return (
      <View style={{ marginVertical: 22 }}>
        <Barcode
          format="EAN13"
          value="0123456789012"
          text="0123456789012"
          width={SIZES.width - 64}
          height={72}
          style={{
            marginBottom: 40,
            backgroundColor: dark ? COLORS.dark1 : COLORS.white,
          }}
          lineColor={dark ? COLORS.white : COLORS.black}
          textStyle={{
            color: dark ? COLORS.white : COLORS.black,
          }}
          maxWidth={SIZES.width - 64}
        />
        <View
          style={[
            styles.summaryContainer,
            {
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              borderRadius: 6,
            },
          ]}
        >
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Name</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              Daniel Austion
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Address</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              6993 Meadow Valley Terrace
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Product</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              Suga Leather Shoes
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Phone</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              +1 111 467 378 399
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Category</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              Shoes
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>ID</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              SHOES XT134
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.summaryContainer,
            {
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              borderRadius: 6,
            },
          ]}
        >
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Amount</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              $60
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Tax</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              $5.55
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Country</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              United States
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.summaryContainer,
            {
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              borderRadius: 6,
            },
          ]}
        >
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Total</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              $605.55
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Payment Methods</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              Credit Card
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Date</Text>
            <Text
              style={[
                styles.viewRight,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              Dec 16, 2026 | 12:23:45 PM
            </Text>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Transaction ID</Text>
            <View style={styles.copyContentContainer}>
              <Text
                style={[
                  styles.viewRight,
                  {
                    color: dark ? COLORS.white : COLORS.primary,
                  },
                ]}
              >
                {transactionId}
              </Text>
              <TouchableOpacity style={{ marginLeft: 8 }} onPress={handleCopyToClipboard}>
                <MaterialCommunityIcons
                  name="content-copy"
                  size={24}
                  color={dark ? COLORS.white : COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.viewContainer}>
            <Text style={styles.viewLeft}>Status</Text>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                {
                  backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  {
                    color: dark ? COLORS.white : COLORS.primary,
                  },
                ]}
              >
                Paid
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <ScrollView
          style={[
            styles.scrollView,
            { backgroundColor: dark ? COLORS.dark1 : COLORS.tertiaryWhite },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </View>
      {/* Modal for dropdown selection */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={{ position: "absolute", top: 112, right: 12 }}>
            <View
              style={{
                width: 202,
                padding: 16,
                backgroundColor: dark ? COLORS.dark2 : COLORS.tertiaryWhite,
                borderRadius: 8,
              }}
            >
              <FlatList
                data={dropdownItems}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginVertical: 12,
                    }}
                    onPress={() => handleDropdownSelect(item)}
                  >
                    <Image
                      source={item.icon}
                      resizeMode="contain"
                      style={{
                        width: 20,
                        height: 20,
                        marginRight: 16,
                        tintColor: dark ? COLORS.white : COLORS.black,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "semiBold",
                        color: dark ? COLORS.white : COLORS.black,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <LoadingModal
        visible={copyModalVisible}
        message="Transaction ID copied to clipboard."
        titleKey="Copied!"
        resultMode={true}
        showActionButton={true}
        onAction={() => setCopyModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  scrollView: {
    backgroundColor: COLORS.tertiaryWhite,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.black,
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black,
  },
  summaryContainer: {
    width: SIZES.width - 32,
    backgroundColor: COLORS.white,
    alignItems: "center",
    padding: 16,
    marginVertical: 8,
  },
  viewContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginVertical: 12,
  },
  viewLeft: {
    fontSize: 12,
    fontFamily: "regular",
    color: "gray",
  },
  viewRight: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.black,
  },
  copyContentContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBtn: {
    width: 72,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 6,
  },
  statusBtnText: {
    fontSize: 12,
    fontFamily: "medium",
    color: COLORS.primary,
  },
});

export default ProductEReceipt;
