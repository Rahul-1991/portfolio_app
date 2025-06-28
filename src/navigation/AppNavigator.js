import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import AddCryptoScreen from '../screens/AddCryptoScreen';
import AddGoldScreen from '../screens/AddGoldScreen';
import AddMutualFundScreen from '../screens/AddMutualFundScreen';
import AddStockScreen from '../screens/AddStockScreen';
import CryptocurrencyScreen from '../screens/CryptocurrencyScreen';
import DashboardScreen from '../screens/DashboardScreen';
import FixedDepositScreen from '../screens/FixedDepositScreen';
import GoldDepositScreen from '../screens/GoldDepositScreen';
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
          headerStatusBarHeight: 0,
          contentStyle: {
            paddingTop: 0,
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
        <Stack.Screen 
          name="Cryptocurrency" 
          component={CryptocurrencyScreen}
          options={{ title: 'Cryptocurrency Portfolio' }}
        />
        <Stack.Screen 
          name="AddCrypto" 
          component={AddCryptoScreen}
          options={{ title: 'Add Cryptocurrency' }}
        />
        <Stack.Screen 
          name="GoldDeposit" 
          component={GoldDepositScreen}
          options={{ title: 'Gold Deposits' }}
        />
        <Stack.Screen 
          name="AddGold" 
          component={AddGoldScreen}
          options={{ title: 'Add Gold Deposit' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 