import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import Svg, { Path, Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// =============================================================
// COLORS
// =============================================================

const COLORS = {
  BLUE: '#1674E8',
  PURPLE: '#2920BD',
  WHITE: '#F4F4F4',

  LIGHT_BLUE_LINE: 'rgba(125,190,255,0.38)',
  PURPLE_EDGE: 'rgba(80,174,255,0.82)',
  INNER_LINE: 'rgba(91,151,255,0.30)',

  BRAND_BLUE: '#159BFF',

  BLACK: '#080808',

  ORANGE: '#E99B20',
};

// =============================================================
// WELCOME SCREEN
//
// Can be used in two ways:
// 1) Rendered directly by App.js on first launch (no navigator
//    around it) -> pass `onContinue` prop.
// 2) Registered as a route inside RootNavigator -> React
//    Navigation automatically passes `navigation` as a prop,
//    no need to call useNavigation() here.
// =============================================================

export default function WelcomeScreen({ onContinue, navigation }) {

  const handleLoginPress = () => {

    if (onContinue) {

      // Used as App.js's first-launch screen (no navigator around it)
      onContinue();

    } else if (navigation) {

      // Used as a route inside RootNavigator
      navigation.navigate('Login');

    }

  };

  return (
<View style={styles.container}>

  {/* =====================================================
      STATUS BAR
  ===================================================== */}

  <StatusBar
    translucent
    backgroundColor="transparent"
    barStyle="light-content"
  />

  {/* =====================================================
      MAIN BLUE BACKGROUND
  ===================================================== */}

  <View style={styles.background} />

  {/* =====================================================
      BACKGROUND DESIGN
  ===================================================== */}

  <Svg
    width={width}
    height={height}
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
  >

    {/* ===================================================
        TOP LARGE THIN CURVE
    =================================================== */}

    <Path
      d={`
        M ${-width * 0.20} ${height * 0.065}

        C ${width * 0.14} ${height * 0.075},
          ${width * 0.46} ${height * 0.13},
          ${width * 0.66} ${height * 0.275}

        C ${width * 0.76} ${height * 0.345},
          ${width * 0.79} ${height * 0.405},
          ${width * 0.80} ${height * 0.465}
      `}
      fill="none"
      stroke={COLORS.LIGHT_BLUE_LINE}
      strokeWidth={2.5}
    />

    {/* ===================================================
        MAIN PURPLE SHAPE
    =================================================== */}

    <Path
      d={`
        M ${width + 35} ${height * 0.285}

        C ${width * 0.86} ${height * 0.315},
          ${width * 0.70} ${height * 0.395},
          ${width * 0.59} ${height * 0.495}

        C ${width * 0.47} ${height * 0.605},
          ${width * 0.42} ${height * 0.735},
          ${width * 0.43} ${height * 0.855}

        C ${width * 0.435} ${height * 0.935},
          ${width * 0.46} ${height * 0.985},
          ${width * 0.50} ${height + 35}

        L ${width + 60} ${height + 35}

        Z
      `}
      fill={COLORS.PURPLE}
    />

    {/* ===================================================
        BLUE OUTER EDGE
    =================================================== */}

    <Path
      d={`
        M ${width + 20} ${height * 0.286}

        C ${width * 0.84} ${height * 0.315},
          ${width * 0.68} ${height * 0.40},
          ${width * 0.57} ${height * 0.505}

        C ${width * 0.46} ${height * 0.62},
          ${width * 0.405} ${height * 0.745},
          ${width * 0.415} ${height * 0.865}

        C ${width * 0.42} ${height * 0.94},
          ${width * 0.445} ${height * 0.99},
          ${width * 0.485} ${height + 20}
      `}
      fill="none"
      stroke={COLORS.PURPLE_EDGE}
      strokeWidth={3}
    />

    {/* ===================================================
        INNER THIN CURVE
    =================================================== */}

    <Path
      d={`
        M ${width + 10} ${height * 0.295}

        C ${width * 0.82} ${height * 0.325},
          ${width * 0.69} ${height * 0.405},
          ${width * 0.60} ${height * 0.505}

        C ${width * 0.51} ${height * 0.615},
          ${width * 0.465} ${height * 0.75},
          ${width * 0.475} ${height * 0.87}

        C ${width * 0.48} ${height * 0.94},
          ${width * 0.50} ${height * 0.985},
          ${width * 0.535} ${height + 20}
      `}
      fill="none"
      stroke={COLORS.INNER_LINE}
      strokeWidth={2}
    />

    {/* ===================================================
        WHITE BOTTOM CURVE
    =================================================== */}

    <Path
      d={`
        M ${width * 0.565} ${height + 25}

        C ${width * 0.545} ${height * 0.925},
          ${width * 0.575} ${height * 0.865},
          ${width * 0.635} ${height * 0.825}

        C ${width * 0.735} ${height * 0.755},
          ${width * 0.855} ${height * 0.705},
          ${width * 1.045} ${height * 0.685}

        L ${width * 1.045} ${height + 25}

        Z
      `}
      fill={COLORS.WHITE}
    />

  </Svg>

  {/* =====================================================
      CONTENT
  ===================================================== */}

  <SafeAreaView style={styles.safeArea}>

    <View style={styles.content}>

      {/* =================================================
          LOGO SECTION
      ================================================= */}

      <View style={styles.logoSection}>

        {/* =================================================
            WHITE CIRCLE + BLUE CHEVRON
        ================================================= */}

        <View style={styles.logoCircle}>

          <Svg
            width={105}
            height={105}
            viewBox="0 0 105 105"
          >

            {/* WHITE CIRCLE */}

            <Circle
              cx="52.5"
              cy="52.5"
              r="52.5"
              fill="#FFFFFF"
            />

            {/* BLUE CHEVRON */}

            <Path
              d="
                M 38 31
                L 62 52.5
                L 38 74
              "
              fill="none"
              stroke={COLORS.BLUE}
              strokeWidth={13}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

          </Svg>

        </View>

        {/* =================================================
            BRAND
            3ala-babak
        ================================================= */}

        <View style={styles.brandRow}>

          <Text style={styles.brandNumber}>
            3
          </Text>

          <Text style={styles.brandName}>
            ala-babak
          </Text>

        </View>

        {/* =================================================
            TAGLINE
        ================================================= */}

        <Text style={styles.tagline}>
          —  طلباتك... على بابك  —
        </Text>

      </View>

      {/* =================================================
          BOTTOM ACTIONS
      ================================================= */}

      <View style={styles.bottomActions}>

        {/* =================================================
            HELP
        ================================================= */}

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.helpButton}
        >

          <Text style={styles.helpText}>
            Need help?
          </Text>

        </TouchableOpacity>

        {/* =================================================
            LOGIN
        ================================================= */}

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.loginButton}
          onPress={handleLoginPress}
        >

          <Text style={styles.loginText}>
            Log in
          </Text>

          {/* =============================================
              ORANGE CHEVRON
          ============================================= */}

          <Svg
            width={28}
            height={42}
            viewBox="0 0 28 42"
          >

            <Path
              d="M6 4 L20 21 L6 38"
              fill="none"
              stroke={COLORS.ORANGE}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

          </Svg>

        </TouchableOpacity>

      </View>

    </View>

  </SafeAreaView>

</View>
  );
}

// =============================================================
// STYLES
// =============================================================

const styles = StyleSheet.create({

// ===========================================================
// MAIN
// ===========================================================

container: {
flex: 1,
backgroundColor: COLORS.BLUE,
overflow: 'hidden',
},

background: {
...StyleSheet.absoluteFillObject,
backgroundColor: COLORS.BLUE,
},

safeArea: {
flex: 1,
},

content: {
flex: 1,
position: 'relative',
},

// ===========================================================
// LOGO SECTION
// ===========================================================

logoSection: {
position: 'absolute',

top: height * 0.225,

left: 0,
right: 0,

alignItems: 'center',

justifyContent: 'flex-start',

zIndex: 10,


},

// ===========================================================
// WHITE CIRCLE
// ===========================================================

logoCircle: {
width: 105,
height: 105,

alignItems: 'center',
justifyContent: 'center',


},

// ===========================================================
// BRAND
// ===========================================================

brandRow: {
flexDirection: 'row',

alignItems: 'flex-end',

marginTop: 18,


},

brandNumber: {
fontSize: 46,

lineHeight: 48,

fontWeight: '800',

fontStyle: 'italic',

color: COLORS.BRAND_BLUE,

marginRight: 2,


},

brandName: {
fontSize: 46,

lineHeight: 48,

fontWeight: '800',

fontStyle: 'italic',

color: '#FFFFFF',

letterSpacing: -1.2,


},

// ===========================================================
// TAGLINE
// ===========================================================

tagline: {
fontSize: 16,

lineHeight: 22,

fontWeight: '500',

color: '#FFFFFF',

marginTop: 5,

letterSpacing: 0.25,


},

// ===========================================================
// BOTTOM ACTIONS
// ===========================================================

bottomActions: {
position: 'absolute',

left: 0,
right: 0,

bottom: 28,

height: 70,

flexDirection: 'row',

alignItems: 'center',

justifyContent: 'space-between',

paddingLeft: 48,

paddingRight: 34,

zIndex: 30,


},

// ===========================================================
// HELP
// ===========================================================

helpButton: {
height: 58,

justifyContent: 'center',

paddingHorizontal: 0,


},

helpText: {
fontSize: 18,

lineHeight: 23,

fontWeight: '600',

color: '#FFFFFF',

letterSpacing: 0.05,


},

// ===========================================================
// LOGIN
// ===========================================================

loginButton: {
height: 62,

minWidth: 185,

flexDirection: 'row',

alignItems: 'center',

justifyContent: 'flex-end',

paddingLeft: 18,

paddingRight: 0,

borderRadius: 32,


},

loginText: {
fontSize: 22,

lineHeight: 28,

fontWeight: '700',

color: COLORS.BLACK,

marginRight: 10,


},

});