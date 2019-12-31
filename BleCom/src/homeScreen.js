import React from 'react';
import {StyleSheet, View, ImageBackground, Alert, Button} from 'react-native';

export default class HomeScreen extends React.Component {
  signupPressed = () => {
    Alert.alert('Completed Sign Up');
  };

  loginPressed = () => {
    Alert.alert('Completed Login!');
  };

  static navigationOptions = {
    title: 'HomeScreen',
  };

  render() {
    const {navigate} = this.props.navigation;
    return (
      <ImageBackground
        source={require('../assets/background.png')}
        style={styles.background}>
        <View style={styles.bottomView}>
          <Button onPress={() => navigate('Bluetooth')} title="Start" />
        </View>
      </ImageBackground>
    );
  }
}

const styles = StyleSheet.create({
  background: {
    width: '100%',
    height: '100%',
  },
  logo: {
    width: 280,
    height: 280,
    marginLeft: '15%',
    marginTop: '10%',
  },
  text: {
    color: 'white',
    marginTop: '-25%',
    marginLeft: '20%',
  },
  signup: {
    backgroundColor: 'white',
    color: '#3A59FF',
    width: '75%',
    borderRadius: 25,
    textAlign: 'center',
    fontWeight: 'bold',
    marginLeft: '11%',
    padding: '2%',
    fontSize: 27,
    marginTop: '70%',
  },
  login: {
    backgroundColor: '#3A59FF',
    color: 'white',
    width: '75%',
    borderRadius: 25,
    textAlign: 'center',
    fontWeight: 'bold',
    marginLeft: '11%',
    padding: '2%',
    fontSize: 27,
    marginTop: '160%',
  },
  bottomView: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
  },
});
