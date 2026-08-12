import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import DisclaimerGate from './src/components/DisclaimerGate';

export default function App() {
  return (
    <DisclaimerGate>
      <View style={styles.container}>
        <Text>Open up App.tsx to start working on your app!</Text>
        <StatusBar style="auto" />
      </View>
    </DisclaimerGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
