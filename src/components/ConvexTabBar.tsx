import { MaterialIcons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

// convex_bottom_bar の TabStyle.reactCircle を再現した自作ボトムバー:
// blueGreyのバー上で、選択タブのアイコンが円形に浮上しspringで移動する。
const BAR_HEIGHT = 50;
const CIRCLE_SIZE = 54;
const CIRCLE_LIFT = -16;

export const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Ranking: 'format-list-numbered',
  Search: 'search',
  Home: 'home',
  MyPage: 'person-pin',
  Setting: 'settings',
};

export function ConvexTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabWidth = width / state.routes.length;
  const circleX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    circleX.value = withSpring(state.index * tabWidth + (tabWidth - CIRCLE_SIZE) / 2, {
      damping: 16,
      stiffness: 180,
    });
  }, [state.index, tabWidth, circleX]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: circleX.value }],
  }));

  const activeRoute = state.routes[state.index];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.circle, circleStyle]}>
        {activeRoute && (
          <MaterialIcons
            name={TAB_ICONS[activeRoute.name] ?? 'circle'}
            size={26}
            color={colors.textPrimary}
          />
        )}
      </Animated.View>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            >
              {/* 浮上円側で描画するため、選択中タブのバー内アイコンは非表示 */}
              {!focused && (
                <MaterialIcons
                  name={TAB_ICONS[route.name] ?? 'circle'}
                  size={24}
                  color={colors.textPrimary}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.blueGrey,
  },
  row: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    top: CIRCLE_LIFT,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.blueGrey,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
});
