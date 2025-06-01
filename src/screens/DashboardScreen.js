import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Paragraph, Surface, Title, useTheme } from 'react-native-paper';
import { INVESTMENT_TYPES, formatCurrency } from '../constants/investments';

const DashboardScreen = ({ navigation }) => {
  const [portfolioData, setPortfolioData] = useState({
    totalInvestment: 0,
    investments: {
      rd: { total: 0, count: 0 },
      fd: { total: 0, count: 0 },
      stocks: { total: 0, count: 0 },
      mf: { total: 0, count: 0 },
    },
  });

  const theme = useTheme();

  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove(['portfolioData', 'transactions_rd', 'transactions_fd', 'transactions_stocks', 'transactions_mf']);
      setPortfolioData({
        totalInvestment: 0,
        investments: {
          rd: { total: 0, count: 0 },
          fd: { total: 0, count: 0 },
          stocks: { total: 0, count: 0 },
          mf: { total: 0, count: 0 },
        },
      });
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  const loadPortfolioData = async () => {
    try {
      const data = await AsyncStorage.getItem('portfolioData');
      if (data) {
        const parsedData = JSON.parse(data);
        setPortfolioData(parsedData);
      }
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPortfolioData();
    }, [])
  );

  const renderInvestmentCard = (investmentType) => {
    const investment = INVESTMENT_TYPES[investmentType];
    const data = portfolioData.investments[investment.id];

    return (
      <Card
        key={investment.id}
        style={styles.card}
        onPress={() => {
          const screenName = {
            rd: 'RecurringDeposit',
            fd: 'FixedDeposit',
            stocks: 'Stocks',
            mf: 'MutualFunds'
          }[investment.id];
          
          navigation.navigate(screenName, { investmentId: investment.id });
        }}
      >
        <Card.Content>
          <Title style={{ color: investment.color }}>{investment.name}</Title>
          <Paragraph>Total: {formatCurrency(data.total)}</Paragraph>
          <Paragraph>Number of Investments: {data.count}</Paragraph>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.totalCard}>
        <Title style={styles.totalTitle}>Total Portfolio Value</Title>
        <Title style={styles.totalAmount}>
          {formatCurrency(portfolioData.totalInvestment)}
        </Title>
        <Button 
          mode="contained" 
          onPress={clearAllData}
          style={{ marginTop: 10, backgroundColor: '#ff5252' }}
        >
          Clear All Data
        </Button>
      </Surface>

      <View style={styles.cardsContainer}>
        {['RECURRING_DEPOSIT', 'FIXED_DEPOSIT', 'STOCKS', 'MUTUAL_FUNDS'].map(type => 
          renderInvestmentCard(type)
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  totalCard: {
    margin: 16,
    padding: 16,
    elevation: 4,
    borderRadius: 8,
    backgroundColor: '#6200ee',
  },
  totalTitle: {
    color: '#fff',
    fontSize: 18,
  },
  totalAmount: {
    color: '#fff',
    fontSize: 24,
    marginTop: 8,
  },
  cardsContainer: {
    padding: 8,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 8,
    elevation: 2,
  },
});

export default DashboardScreen; 