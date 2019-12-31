import React from 'react';
import HomeScreen from './src/homeScreen';
import Bluetooth from './src/bluetooth';
import {createAppContainer} from 'react-navigation';
import {createStackNavigator} from 'react-navigation-stack';
const App = createStackNavigator(
  {
    HomeScreen: {screen: HomeScreen},
    Bluetooth: {screen: Bluetooth},
  },
  {
    initialRouteName: 'HomeScreen',
  },
);
export default createAppContainer(App);
