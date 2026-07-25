import {
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export default function App() {
  const [fontsLoaded] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_500Medium,
    MPLUSRounded1c_700Bold,
  });
  if (!fontsLoaded) {
    return null;
  }
  return (
    <View style={styles.container}>
      <Text style={styles.text}>😁まとめくん😁</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontFamily: 'MPLUSRounded1c_700Bold',
    fontSize: 20,
  },
});
