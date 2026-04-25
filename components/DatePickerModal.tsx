import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DatePicker from "react-native-modern-datepicker";

import { COLORS } from "../constants";

interface DatePickerModalProps {
  open: boolean;
  startDate: string;
  selectedDate: string;
  onClose: () => void;
  onChangeStartDate: (date: string) => void;
}

// Suppress defaultProps warning
/*const error = console.error;
console.error = (...args: any[]) => {
  if (/defaultProps/.test(args[0])) return;
  error(...args);
};*/

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  open,
  startDate,
  selectedDate,
  onClose,
  onChangeStartDate,
}) => {
  const [selectedStartDate, setSelectedStartDate] = useState<string>(selectedDate);

  const handleDateChange = (date: string) => {
    setSelectedStartDate(date);
    onChangeStartDate(date);
  };

  const handleOnPressStartDate = () => {
    onClose();
  };

  const modalVisible = open;

  return (
    <Modal animationType="slide" transparent={true} visible={modalVisible}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <DatePicker
            mode="calendar"
            locale="en" // This sets the language to English
            isGregorian={true}
            minimumDate={startDate}
            selected={selectedStartDate}
            onDateChange={handleDateChange}
            onSelectedChange={(date: string) => setSelectedStartDate(date)}
            options={{
              backgroundColor: COLORS.primary,
              textHeaderColor: COLORS.white,
              textDefaultColor: "#FFFFFF",
              selectedTextColor: COLORS.primary,
              mainColor: COLORS.white,
              textSecondaryColor: "#FFFFFF",
              borderColor: COLORS.primary,
            }}
          />
          <TouchableOpacity onPress={handleOnPressStartDate}>
            <Text style={{ color: "white" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalView: {
    margin: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    padding: 35,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default DatePickerModal;
