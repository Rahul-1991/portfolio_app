import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Surface, useTheme } from 'react-native-paper';
import { INVESTMENT_TYPES, formatCurrency } from '../constants/investments';

// Function to calculate realistic FD current value
const calculateFDCurrentValue = (fdTransaction) => {
  const startDate = new Date(fdTransaction.investedOn);
  const currentDate = new Date();
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + fdTransaction.duration);
  
  // If FD has matured, return maturity amount
  if (currentDate >= maturityDate) {
    return fdTransaction.maturityAmount;
  }
  
  // If FD is still running, calculate current value based on time elapsed
  const monthsElapsed = (currentDate - startDate) / (1000 * 60 * 60 * 24 * 30.44); // Approximate months
  const rate = fdTransaction.roi / 100;
  
  // Calculate current value using simple interest (most FDs use simple interest)
  const currentValue = fdTransaction.amount * (1 + (rate * monthsElapsed / 12));
  
  return Math.round(currentValue);
};

// Function to calculate realistic RD current value
const calculateRDCurrentValue = (rdTransaction) => {
  const startDate = new Date(rdTransaction.investedOn);
  const currentDate = new Date();
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + rdTransaction.duration);
  
  // If RD has matured, return maturity amount
  if (currentDate >= maturityDate) {
    return rdTransaction.maturityAmount;
  }
  
  // Calculate months elapsed since start
  const monthsElapsed = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24 * 30.44));
  
  // If less than 1 month, return the monthly deposit amount (principal)
  if (monthsElapsed < 1) {
    return rdTransaction.amount;
  }
  
  // Calculate current value using RD formula
  const monthlyRate = rdTransaction.roi / (12 * 100);
  const depositsMade = Math.min(monthsElapsed, rdTransaction.duration);
  const currentValue = rdTransaction.amount * depositsMade * (1 + (depositsMade + 1) * monthlyRate / 2);
  
  return Math.round(currentValue);
};

const DashboardScreen = ({ navigation }) => {
  const [portfolioData, setPortfolioData] = useState({
    totalInvestment: 0,
    currentValue: 0,
    totalGain: 0,
    gainPercentage: 0,
    investments: {
      rd: { total: 0, count: 0, currentValue: 0 },
      fd: { total: 0, count: 0, currentValue: 0 },
      stocks: { total: 0, count: 0, currentValue: 0 },
      mf: { total: 0, count: 0, currentValue: 0 },
      crypto: { total: 0, count: 0, currentValue: 0 },
      gold: { total: 0, count: 0, currentValue: 0 },
    },
  });

  const theme = useTheme();

  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'portfolioData',
        'transactions_rd',
        'transactions_fd',
        'transactions_stocks',
        'transactions_mf',
        'transactions_crypto'
      ]);
      setPortfolioData({
        totalInvestment: 0,
        currentValue: 0,
        totalGain: 0,
        gainPercentage: 0,
        investments: {
          rd: { total: 0, count: 0, currentValue: 0 },
          fd: { total: 0, count: 0, currentValue: 0 },
          stocks: { total: 0, count: 0, currentValue: 0 },
          mf: { total: 0, count: 0, currentValue: 0 },
          crypto: { total: 0, count: 0, currentValue: 0 },
          gold: { total: 0, count: 0, currentValue: 0 },
        },
      });
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  const loadPortfolioData = async () => {
    try {
      // Load all transactions
      const [rdData, fdData, stocksData, mfData, cryptoData, goldData] = await Promise.all([
        AsyncStorage.getItem('transactions_rd'),
        AsyncStorage.getItem('transactions_fd'),
        AsyncStorage.getItem('transactions_stocks'),
        AsyncStorage.getItem('transactions_mf'),
        AsyncStorage.getItem('transactions_crypto'),
        AsyncStorage.getItem('transactions_gold')
      ]);

      const investments = {
        rd: { total: 0, count: 0, currentValue: 0 },
        fd: { total: 0, count: 0, currentValue: 0 },
        stocks: { total: 0, count: 0, currentValue: 0 },
        mf: { total: 0, count: 0, currentValue: 0 },
        crypto: { total: 0, count: 0, currentValue: 0 },
        gold: { total: 0, count: 0, currentValue: 0 },
      };

      // Calculate RD total
      if (rdData) {
        const rdTransactions = JSON.parse(rdData);
        const rdTotal = rdTransactions.reduce((sum, t) => sum + (t.amount * t.duration), 0);
        
        // Calculate realistic current value for each RD
        let rdCurrentValue = 0;
        for (const transaction of rdTransactions) {
          rdCurrentValue += calculateRDCurrentValue(transaction);
        }
        
        investments.rd = {
          total: rdTotal,
          count: rdTransactions.length,
          currentValue: rdCurrentValue,
        };
      }

      // Calculate FD total
      if (fdData) {
        const fdTransactions = JSON.parse(fdData);
        const fdTotal = fdTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate realistic current value for each FD
        let fdCurrentValue = 0;
        for (const transaction of fdTransactions) {
          fdCurrentValue += calculateFDCurrentValue(transaction);
        }
        
        investments.fd = {
          total: fdTotal,
          count: fdTransactions.length,
          currentValue: fdCurrentValue,
        };
      }

      // Calculate Stocks total
      if (stocksData) {
        const stockTransactions = JSON.parse(stocksData);
        const stocksTotal = stockTransactions.reduce((sum, t) => sum + t.investmentAmount, 0);
        investments.stocks = {
          total: stocksTotal,
          count: stockTransactions.length,
          currentValue: stocksTotal, // Will be updated with real-time data below
        };
      }

      // Calculate MF total
      if (mfData) {
        const mfTransactions = JSON.parse(mfData);
        const mfTotal = mfTransactions.reduce((sum, t) => sum + t.investmentAmount, 0);
        investments.mf = {
          total: mfTotal,
          count: mfTransactions.length,
          currentValue: mfTotal, // Will be updated with real-time data below
        };
      }

      // Calculate Crypto total
      if (cryptoData) {
        const cryptoTransactions = JSON.parse(cryptoData);
        const cryptoTotal = cryptoTransactions.reduce((sum, t) => sum + t.investmentAmount, 0);
        investments.crypto = {
          total: cryptoTotal,
          count: cryptoTransactions.length,
          currentValue: cryptoTotal,
        };
      }

      // Calculate Gold total
      if (goldData) {
        const goldTransactions = JSON.parse(goldData);
        const goldTotal = goldTransactions.reduce((sum, t) => sum + t.investmentAmount, 0);
        investments.gold = {
          total: goldTotal,
          count: goldTransactions.length,
          currentValue: goldTotal, // Will be updated with real-time data below
        };
      }

      const totalInvestment = Object.values(investments).reduce(
        (sum, inv) => sum + inv.total,
        0
      );

      // Add debug logs for each investment type
      console.log('RD currentValue:', investments.rd.currentValue);
      console.log('FD currentValue:', investments.fd.currentValue);
      console.log('Stocks currentValue:', investments.stocks.currentValue);
      console.log('MF currentValue:', investments.mf.currentValue);
      console.log('Crypto currentValue:', investments.crypto.currentValue);
      console.log('Gold currentValue:', investments.gold.currentValue);

      // Calculate current values for different investment types
      let currentValue = 0;

      // Add RD and FD current values
      currentValue += investments.rd.currentValue;
      currentValue += investments.fd.currentValue;
      currentValue += investments.stocks.currentValue;
      currentValue += investments.mf.currentValue;
      currentValue += investments.crypto.currentValue;
      currentValue += investments.gold.currentValue;

      // Debug log for total currentValue
      console.log('Total Investment:', totalInvestment);
      console.log('Current Value:', currentValue);
      if (isNaN(currentValue)) {
        console.error('Current value is NaN! Check all investment calculations.');
      }

      const totalGain = currentValue - totalInvestment;
      const gainPercentage = totalInvestment > 0 ? (totalGain / totalInvestment) * 100 : 0;

      const portfolioData = {
        totalInvestment,
        currentValue,
        totalGain,
        gainPercentage,
        investments,
      };

      await AsyncStorage.setItem('portfolioData', JSON.stringify(portfolioData));
      setPortfolioData(portfolioData);
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
    
    // Calculate percentage of total portfolio
    const percentage = portfolioData.totalInvestment > 0 
      ? (data.total / portfolioData.totalInvestment) * 100 
      : 0;

    return (
      <Card
        key={investment.id}
        style={styles.card}
        onPress={() => {
          const screenName = {
            rd: 'RecurringDeposit',
            fd: 'FixedDeposit',
            stocks: 'Stocks',
            mf: 'MutualFunds',
            crypto: 'Cryptocurrency',
            gold: 'GoldDeposit'
          }[investment.id];
          
          navigation.navigate(screenName, { investmentId: investment.id });
        }}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={[styles.cardTitle, { color: investment.color }]}>
                {investment.name}
              </Text>
            </View>
            <View style={styles.percentageContainer}>
              <Text style={styles.percentageText}>
                {percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amountText}>
              {formatCurrency(data.currentValue, 0)}
            </Text>
          </View>
          
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              {data.count} {data.count === 1 ? 'investment' : 'investments'}
            </Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: investment.color }]} />
          </View>
          
          <Text style={styles.progressLabel}>Portfolio allocation</Text>
        </Card.Content>
      </Card>
    );
  };

  // Check if any investments exist
  const hasAnyInvestments = Object.values(portfolioData.investments).some(inv => inv.count > 0);

  return (
    <ScrollView style={styles.container}>
      {hasAnyInvestments && (
        <Surface style={styles.totalCard}>
          <Text style={styles.totalAmount}>
            {formatCurrency(portfolioData.currentValue, 0)}
          </Text>
          <View style={styles.gainLossContainer}>
            <Text style={[
              styles.gainLossIcon,
              { color: portfolioData.totalGain >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              {portfolioData.totalGain >= 0 ? '▲' : '▼'}
            </Text>
            <View style={styles.gainLossTextContainer}>
              <Text style={[
                styles.gainLossAmount,
                { color: portfolioData.totalGain >= 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {portfolioData.totalGain >= 0 ? '+' : ''}{formatCurrency(portfolioData.totalGain, 0)}
              </Text>
              <Text style={[
                styles.gainLossPercentage,
                { color: portfolioData.totalGain >= 0 ? '#4CAF50' : '#F44336' }
              ]}>
                ({portfolioData.gainPercentage >= 0 ? '+' : ''}{portfolioData.gainPercentage.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </Surface>
      )}

      <View style={styles.cardsContainer}>
        {['RECURRING_DEPOSIT', 'FIXED_DEPOSIT', 'STOCKS', 'MUTUAL_FUNDS', 'CRYPTOCURRENCY', 'GOLD_DEPOSIT'].map(type => 
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
  totalAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'left',
  },
  cardsContainer: {
    padding: 8,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 8,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  percentageContainer: {
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  amountContainer: {
    marginBottom: 4,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  countContainer: {
    marginBottom: 12,
  },
  countText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  gainLossIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  gainLossTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gainLossAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  gainLossPercentage: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default DashboardScreen; 