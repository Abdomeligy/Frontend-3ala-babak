import React, { useEffect, useState } from 'react';

import {
  StyleSheet,
  View,
  StatusBar,
  Image,
  ActivityIndicator,
  LogBox,
  Dimensions,
  Text,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { SocketProvider } from './src/context/SocketContext';
import { VendorStoreProvider } from './src/context/VendorStoreContext';

import RootNavigator from './src/navigation/RootNavigator';

import WelcomeScreen from './src/screens/Auth/WelcomeScreen';
import './src/tasks/backgroundLocationTask'; // مجرد import يخلي التطبيق يسجل المهمة أول ما يفتح
import Svg, { Path } from 'react-native-svg';


// ============================================================
// LOGS
// ============================================================

LogBox.ignoreLogs([
  'shadow* style props are deprecated',
  'props.pointerEvents is deprecated',
]);


// ============================================================
// FIRST LAUNCH
// ============================================================

const FIRST_LAUNCH_KEY = '@3alababak_has_opened';


// ============================================================
// LOGO
// ============================================================

const LOGO_SOURCE = require('./assets/images/logo.png');


// ============================================================
// SCREEN
// ============================================================

const { width, height } = Dimensions.get('window');


// ============================================================
// APP
// ============================================================

export default function App() {

  const [startup, setStartup] = useState('checking');


  // ==========================================================
  // CHECK FIRST LAUNCH
  // ==========================================================

  useEffect(() => {

    checkFirstLaunch();

  }, []);


  // ==========================================================
  // CHECK FIRST LAUNCH
  // ==========================================================

  const checkFirstLaunch = async () => {

    try {

      const hasOpened =
        await AsyncStorage.getItem(
          FIRST_LAUNCH_KEY
        );


      if (!hasOpened) {

        setStartup('first');

        return;

      }


      setStartup('returning');

    } catch (error) {

      console.log(
        'FIRST LAUNCH CHECK ERROR:',
        error
      );

      setStartup('first');

    }

  };


  // ==========================================================
  // CONTINUE FROM WELCOME
  // ==========================================================

  const handleFirstLaunchContinue = async () => {

    try {

      await AsyncStorage.setItem(
        FIRST_LAUNCH_KEY,
        'true'
      );

    } catch (error) {

      console.log(
        'SAVE FIRST LAUNCH ERROR:',
        error
      );

    }


    setStartup('app');

  };


  // ==========================================================
  // CHECKING
  // ==========================================================

  if (startup === 'checking') {

    return (

      <View style={styles.loadingContainer}>

        <StatusBar
          barStyle="light-content"
          backgroundColor="#1769E8"
        />

        <ActivityIndicator
          size="small"
          color="#FFFFFF"
        />

      </View>

    );

  }


  // ==========================================================
  // FIRST TIME
  // ==========================================================

  if (startup === 'first') {

    return (

      <WelcomeScreen
        onContinue={
          handleFirstLaunchContinue
        }
      />

    );

  }


  // ==========================================================
  // SPLASH
  // ==========================================================

  if (startup === 'returning') {

    return (

      <SplashScreen
        onFinish={() => {
          setStartup('app');
        }}
      />

    );

  }


  // ==========================================================
  // MAIN APP
  // ==========================================================

  return (

    <AuthProvider>

      <CartProvider>

        <SocketProvider>

          <VendorStoreProvider>

            <View style={styles.container}>

              <StatusBar
                barStyle="dark-content"
                backgroundColor="#FFFFFF"
              />

              <RootNavigator />

            </View>

          </VendorStoreProvider>

        </SocketProvider>

      </CartProvider>

    </AuthProvider>

  );

}


// ============================================================
// SPLASH SCREEN
// ============================================================

function SplashScreen({ onFinish }) {

  useEffect(() => {

    const timer = setTimeout(() => {

      if (onFinish) {
        onFinish();
      }

    }, 3000);


    return () => {

      clearTimeout(timer);

    };

  }, [onFinish]);


  return (

    <View style={styles.splashContainer}>

      <StatusBar
        barStyle="light-content"
        backgroundColor="#1769E8"
        translucent={false}
      />


      {/* ====================================================
          BLUE BACKGROUND
      ==================================================== */}

      <View style={styles.blueBackground} />


      {/* ====================================================
          BACKGROUND CURVES
      ==================================================== */}

      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >

        {/* TOP CURVE */}

        <Path
          d={`
            M ${-width * 0.25} ${height * 0.08}

            C ${width * 0.18} ${height * 0.09},
              ${width * 0.48} ${height * 0.16},
              ${width * 0.70} ${height * 0.35}

            C ${width * 0.80} ${height * 0.44},
              ${width * 0.82} ${height * 0.53},
              ${width * 0.80} ${height * 0.62}
          `}
          fill="none"
          stroke="rgba(105,190,255,0.35)"
          strokeWidth={3}
        />


        {/* PURPLE SHAPE */}

        <Path
          d={`
            M ${width + 30} ${height * 0.29}

            C ${width * 0.80} ${height * 0.34},
              ${width * 0.64} ${height * 0.43},
              ${width * 0.53} ${height * 0.57}

            C ${width * 0.43} ${height * 0.70},
              ${width * 0.40} ${height * 0.84},
              ${width * 0.43} ${height + 30}

            L ${width + 50} ${height + 30}

            Z
          `}
          fill="#2921B8"
        />


        {/* PURPLE OUTER LINE */}

        <Path
          d={`
            M ${width + 10} ${height * 0.29}

            C ${width * 0.78} ${height * 0.34},
              ${width * 0.62} ${height * 0.44},
              ${width * 0.51} ${height * 0.58}

            C ${width * 0.42} ${height * 0.71},
              ${width * 0.39} ${height * 0.85},
              ${width * 0.42} ${height + 20}
          `}
          fill="none"
          stroke="rgba(70,180,255,0.75)"
          strokeWidth={4}
        />


        {/* WHITE BOTTOM AREA */}

        <Path
          d={`
            M ${width * 0.57} ${height + 25}

            C ${width * 0.54} ${height * 0.94},
              ${width * 0.58} ${height * 0.87},
              ${width * 0.66} ${height * 0.81}

            C ${width * 0.76} ${height * 0.74},
              ${width * 0.88} ${height * 0.70},
              ${width * 1.05} ${height * 0.68}

            L ${width * 1.05} ${height + 25}

            Z
          `}
          fill="#FFFFFF"
        />

      </Svg>


      {/* ====================================================
          SPLASH CONTENT
      ==================================================== */}

      <View style={styles.splashContent}>


        {/* ==================================================
            LOGO WHITE BACKGROUND
        ================================================== */}

        <View style={styles.logoWhiteBox}>

          <Image
            source={LOGO_SOURCE}
            style={styles.logo}
            resizeMode="contain"
          />

        </View>


        {/* ==================================================
            GUIDANCE MESSAGE
        ================================================== */}

        <View style={styles.messageContainer}>

          <Text style={styles.messageTitle}>
            كل طلباتك على بابك
          </Text>

          <Text style={styles.messageText}>
            بنجهز لك تجربة سهلة وسريعة
          </Text>

        </View>


        {/* ==================================================
            LOADING
        ================================================== */}

        <ActivityIndicator
          size="small"
          color="#cdfa03"
          style={styles.loader}
        />

      </View>

    </View>

  );

}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // MAIN
  // ==========================================================

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },


  // ==========================================================
  // CHECKING
  // ==========================================================

  loadingContainer: {
    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: '#1769E8',
  },


  // ==========================================================
  // SPLASH
  // ==========================================================

  splashContainer: {
    flex: 1,

    backgroundColor: '#1769E8',

    overflow: 'hidden',
  },


  // ==========================================================
  // BLUE BACKGROUND
  // ==========================================================

  blueBackground: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: '#1769E8',
  },


  // ==========================================================
  // CONTENT
  // ==========================================================

  splashContent: {
    flex: 1,

    alignItems: 'center',

    position: 'relative',

    zIndex: 10,

    paddingTop: height * 0.20,
  },


  // ==========================================================
  // WHITE LOGO BOX
  // ==========================================================

  logoWhiteBox: {
    width: width * 0.42,

    height: width * 0.42,

    maxWidth: 330,

    maxHeight: 330,

    backgroundColor: '#ffff',

    borderRadius: 35,

    justifyContent: 'center',

    alignItems: 'center',

    shadowColor: '#2b08f0',

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.15,

    shadowRadius: 18,

    elevation: 10,
  },


  // ==========================================================
  // LOGO
  // ==========================================================

  logo: {
    width: '88%',

    height: '100%',
  },


  // ==========================================================
  // MESSAGE
  // ==========================================================

  messageContainer: {
    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 35,

    paddingHorizontal: 30,
  },


  messageTitle: {
    fontSize: 24,

    lineHeight: 32,

    fontWeight: '800',

    color: '#FFFFFF',

    textAlign: 'center',
  },


  messageText: {
    fontSize: 16,

    lineHeight: 25,

    fontWeight: '500',

    color: 'rgba(255,255,255,0.88)',

    textAlign: 'center',

    marginTop: 7,
  },


  // ==========================================================
  // LOADER
  // ==========================================================

  loader: {
    position: 'absolute',

    bottom: 55,
  },

});