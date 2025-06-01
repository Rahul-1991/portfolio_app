import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import AddMutualFundScreen from '../screens/AddMutualFundScreen';
import AddStockScreen from '../screens/AddStockScreen';
import DashboardScreen from '../screens/DashboardScreen';
import FixedDepositScreen from '../screens/FixedDepositScreen';
import ImportMutualFundScreen from '../screens/ImportMutualFundScreen';
import MutualFundsScreen from '../screens/MutualFundsScreen';
import RecurringDepositScreen from '../screens/RecurringDepositScreen';
import StocksScreen from '../screens/StocksScreen';

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
          name="Stocks" 
          component={StocksScreen}
          options={{ title: 'Stocks Portfolio' }}
        />
        <Stack.Screen 
          name="AddStock" 
          component={AddStockScreen}
          options={{ title: 'Add Stock' }}
        />
        <Stack.Screen 
          name="MutualFunds" 
          component={MutualFundsScreen}
          options={{ title: 'Mutual Funds Portfolio' }}
        />
        <Stack.Screen 
          name="AddMutualFund" 
          component={AddMutualFundScreen}
          options={{ title: 'Add Mutual Fund' }}
        />
        <Stack.Screen 
          name="ImportMutualFund" 
          component={ImportMutualFundScreen}
          options={{ title: 'Import Existing Investment' }}
        />
        <Stack.Screen 
          name="RecurringDeposit" 
          component={RecurringDepositScreen}
          options={{ title: 'Recurring Deposits' }}
        />
        <Stack.Screen 
          name="FixedDeposit" 
          component={FixedDepositScreen}
          options={{ title: 'Fixed Deposits' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 