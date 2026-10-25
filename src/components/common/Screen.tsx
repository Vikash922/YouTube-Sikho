import React from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  ViewStyle,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { OfflineBanner } from './OfflineBanner';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  disableDismissKeyboard?: boolean;
  withTopInset?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  disableDismissKeyboard = false,
  withTopInset = true,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: withTopInset ? insets.top : 0,
        },
        style,
      ]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <OfflineBanner />
      {children}
    </View>
  );

  if (disableDismissKeyboard) {
    return content;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {content}
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
