import React from "react";

import SubHeaderItem from "../SubHeaderItem";

type Props = {
  title: string;
  onPressText?: string;
  onPress?: () => void;
};

export default function SectionHeader({
  title,
  onPressText = "See all",
  onPress = () => {},
}: Props) {
  return <SubHeaderItem title={title} navTitle={onPressText} onPress={onPress} />;
}
