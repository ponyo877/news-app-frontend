import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily, radius } from '@/theme/typography';

// FlutterのTabBar(indicatorSize: TabBarIndicatorSize.label +
// BoxDecoration(borderRadius: 50, color: blueGrey))を忠実に再現:
//   高さ46 / ピルは「ラベルの実幅×タブ全高」/ スワイプに指追従でスライド /
//   選択=白・非選択=white70(Material darkテーマのTabBar既定)
// 位置はposition(ネイティブ駆動)のtranslateXで連続追従し、
// 幅はタブ確定時にLayoutAnimationで滑らかに切り替える(width自体はネイティブ駆動不可のため)
const TAB_BAR_HEIGHT = 46;
const UNSELECTED_COLOR = 'rgba(255, 255, 255, 0.7)';
const WIDTH_TRANSITION_MS = 150;

export function PillTabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
  const { width } = useWindowDimensions();
  const tabWidth = width / state.routes.length;
  const [labelWidths, setLabelWidths] = useState<Record<number, number>>({});

  const count = state.routes.length;
  const allMeasured = state.routes.every((_, i) => (labelWidths[i] ?? 0) > 0);
  const activeWidth = labelWidths[state.index] ?? 0;

  useEffect(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(WIDTH_TRANSITION_MS, 'easeInEaseOut', 'opacity'),
    );
  }, [state.index]);

  // ピル左端 = タブ左端 + (タブ幅 - ラベル幅) / 2 をスワイプ位置で補間
  const translateX =
    count > 1
      ? position.interpolate({
          inputRange: state.routes.map((_, i) => i),
          outputRange: state.routes.map(
            (_, i) => i * tabWidth + (tabWidth - (labelWidths[i] ?? 0)) / 2,
          ),
        })
      : (tabWidth - activeWidth) / 2;

  return (
    <View style={styles.bar}>
      {allMeasured && (
        <Animated.View
          style={[styles.pill, { width: activeWidth, transform: [{ translateX }] }]}
        />
      )}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key] ?? {};
        const color = focused ? colors.textPrimary : UNSELECTED_COLOR;
        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
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
            <View
              onLayout={(e) => {
                const measured = Math.ceil(e.nativeEvent.layout.width);
                setLabelWidths((prev) =>
                  prev[index] === measured ? prev : { ...prev, [index]: measured },
                );
              }}
            >
              {renderLabel(options?.tabBarLabel, route.name, focused, color)}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

type TabBarLabelOption =
  | string
  | ((props: { focused: boolean; color: string; children: string }) => ReactNode)
  | undefined;

function renderLabel(
  label: TabBarLabelOption,
  routeName: string,
  focused: boolean,
  color: string,
): ReactNode {
  if (typeof label === 'function') {
    return label({ focused, color, children: routeName });
  }
  return <Text style={[styles.fallbackLabel, { color }]}>{label ?? routeName}</Text>;
}

const styles = StyleSheet.create({
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.pill,
    backgroundColor: colors.blueGrey,
  },
  fallbackLabel: {
    fontSize: 18,
    fontFamily: fontFamily.regular,
  },
});
