import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily, radius } from '@/theme/typography';

// FlutterのTabBar(indicatorSize: TabBarIndicatorSize.label +
// BoxDecoration(borderRadius: 50, color: blueGrey))を再現:
//   高さ46 / ピルは「タブの占有幅 - ラベル余白」/ スワイプに指追従でスライド /
//   選択=白・非選択=white70(Material darkテーマのTabBar既定)
//
// 旧版は indicatorSize: label だが、タブのラベルが Center(...) で包まれていた
// (例: Center(child: Text("Daily")))。Flutterの Center は利用可能な幅いっぱいに
// 広がるため、「ラベル幅」= タブの占有幅となり、実際にはピルがタブ全体を覆っていた。
// テキストの実寸を測るとピルが文字に張り付いてしまい旧版と一致しないので、
// タブ幅から左右のラベル余白を引いた固定幅にする。
const TAB_BAR_HEIGHT = 46;
const UNSELECTED_COLOR = 'rgba(255, 255, 255, 0.7)';
// FlutterのTabBar既定 kTabLabelPadding = EdgeInsets.symmetric(horizontal: 16) 相当。
// styles.tab の paddingHorizontal と必ず同じ値にすること
const LABEL_PADDING = 16;

export function PillTabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
  const { width } = useWindowDimensions();
  const tabWidth = width / state.routes.length;
  // どのタブでも同じ幅。ラベルの文字数に依存させない
  const pillWidth = Math.max(0, tabWidth - LABEL_PADDING * 2);

  // スワイプ中も指に追従してスライドする(旧版のTabController連動と同じ)。
  // 幅が一定になったのでネイティブ駆動のtranslateXだけで完結する
  const translateX = Animated.add(Animated.multiply(position, tabWidth), LABEL_PADDING);

  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.pill, { width: pillWidth, transform: [{ translateX }] }]} />
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
            {renderLabel(options?.tabBarLabel, route.name, focused, color)}
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
    // LABEL_PADDING と同じ値。ピル幅の算出根拠になっている
    paddingHorizontal: LABEL_PADDING,
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
