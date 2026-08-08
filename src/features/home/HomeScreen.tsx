import { MaterialIcons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { PillTabBar } from '@/components/PillTabBar';
import { LatestList } from '@/features/home/LatestList';
import { ForYouList } from '@/features/home/ForYouList';
import { useArticleActionSheet } from '@/features/article/useArticleActionSheet';
import { colors } from '@/theme/colors';
import { innerTabScreenOptions } from '@/theme/innerTabs';
import { fontFamily, fontSize } from '@/theme/typography';

const Tab = createMaterialTopTabNavigator();

// Homeタブ: 新着(無限スクロール) / for You(旧版はdaily人気と同一データ)
export function HomeScreen() {
  const { openSheet, sheet } = useArticleActionSheet();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={innerTabScreenOptions}
        tabBar={(props) => <PillTabBar {...props} />}
      >
        <Tab.Screen
          name="Latest"
          options={{
            tabBarLabel: ({ color }) => <MaterialIcons name="fiber-new" size={30} color={color} />,
          }}
        >
          {() => <LatestList onPressMenu={openSheet} />}
        </Tab.Screen>
        <Tab.Screen
          name="ForYou"
          options={{
            tabBarLabel: ({ color }) => (
              <View style={styles.forYouLabel}>
                <MaterialIcons name="recommend" size={30} color={color} />
                <Text style={[styles.forYouText, { color }]}>for You</Text>
              </View>
            ),
          }}
        >
          {() => <ForYouList onPressMenu={openSheet} />}
        </Tab.Screen>
      </Tab.Navigator>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  forYouLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  forYouText: {
    fontSize: fontSize.tabLabel,
    fontFamily: fontFamily.regular,
  },
});
