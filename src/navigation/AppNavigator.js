import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import FixedDepositScreen from '../screens/FixedDepositScreen';
import RecurringDepositScreen from '../screens/RecurringDepositScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6200ee',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{ title: 'Portfolio Dashboard' }}
        />
        <Stack.Screen 
          name="FixedDeposit" 
          component={FixedDepositScreen}
          options={{ title: 'Fixed Deposit' }}
        />
        <Stack.Screen 
          name="RecurringDeposit" 
          component={RecurringDepositScreen}
          options={{ title: 'Recurring Deposit' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 