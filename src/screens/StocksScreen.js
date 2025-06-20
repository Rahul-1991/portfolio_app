import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Divider, FAB, Surface, useTheme } from 'react-native-paper';
import { formatCurrencyNoDecimals } from '../constants/investments';
import { stocksAPI } from '../services/stocksAPI';

const TransactionCard = ({ transaction, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [currentData, setCurrentData] = useState(null);

  useEffect(() => {
    const fetchCurrentData = async () => {
      try {
        const data = await stocksAPI.getStockDetails(transaction.symbol);
        setCurrentData(data);
      } catch (error) {
        console.error('Error fetching current data:', error);
      }
    };

    fetchCurrentData();
    // Refresh every minute during market hours
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      // Check if market is open (9:15 AM to 3:30 PM IST)
      if ((hours > 9 || (hours === 9 && minutes >= 15)) && (hours < 15 || (hours === 15 && minutes <= 30))) {
        fetchCurrentData();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [transaction.symbol]);

  const calculatePL = () => {
    if (!currentData) return { amount: 0, percentage: 0 };
    const currentValue = currentData.currentPrice * transaction.quantity;
    const investedValue = transaction.averagePrice * transaction.quantity;
    const plAmount = currentValue - investedValue;
    const plPercentage = (plAmount / investedValue) * 100;
    return {
      amount: plAmount,
      percentage: plPercentage
    };
  };

  const pl = calculatePL();
  const totalInvestment = transaction.quantity * transaction.averagePrice;
  const currentValue = currentData ? currentData.currentPrice * transaction.quantity : totalInvestment;
  const dayChangeAmount = currentData && currentData.change ? transaction.quantity * parseFloat(currentData.change) : 0;
  const hasValidData = currentData && currentData.change && !isNaN(parseFloat(currentData.change));

  return (
    <Card style={baseStyles.investmentCard}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={baseStyles.cardContainer}>
          {/* Top Row: Logo + (Stock Name + Day Change) */}
          <View style={baseStyles.topRowContainer}>
            <View style={baseStyles.logoContainer}>
              <View style={baseStyles.logoCircle}>
                <Text style={baseStyles.logoText}>
                  {transaction.name ? transaction.name.charAt(0) : '?'}
                </Text>
              </View>
            </View>
            <View style={baseStyles.cardContent}>
              <View style={baseStyles.topRow}>
                <Text style={baseStyles.stockName}>{transaction.name}</Text>
                <View style={baseStyles.dayChangeContainer}>
                  <Text style={baseStyles.dayChangeLabel}>1D change</Text>
                  <Text style={baseStyles.dayChangeAmount}>
                    {hasValidData ? formatCurrencyNoDecimals(dayChangeAmount).replace(/\s(?=\d)/, '') : 'N/A'}
                  </Text>
                  <Text> </Text>
                  <Text style={[
                    baseStyles.dayChangePercent,
                    { color: hasValidData ? (parseFloat(currentData.change) >= 0 ? '#4CAF50' : '#F44336') : '#888' }
                  ]}>
                    {hasValidData ? (parseFloat(currentData.change) >= 0 ? '+' : '') + (currentData.changePercent || '0.00') + '%' : 'N/A'}
                  </Text>
                  <Text style={[
                    baseStyles.dayChangeArrow,
                    { color: hasValidData ? (parseFloat(currentData.change) >= 0 ? '#4CAF50' : '#F44336') : '#888' }
                  ]}>
                    {hasValidData ? (parseFloat(currentData.change) >= 0 ? '▲' : '▼') : ''}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={baseStyles.deleteButton}
              onPress={() => onDelete(transaction)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
          {/* Label Row: Invested, Current Value, Gain/Loss (full width, left aligned) */}
          <View style={baseStyles.labelRow}>
            <View style={baseStyles.labelColumn}>
              <Text style={baseStyles.label}>Invested</Text>
            </View>
            <View style={baseStyles.labelColumn}>
              <Text style={baseStyles.label}>Current Value</Text>
            </View>
            <View style={baseStyles.labelColumn}>
              <Text style={baseStyles.label}>Gain/ Loss</Text>
            </View>
          </View>
          {/* Value Row: Invested, Current Value, Gain/Loss (full width, left aligned) */}
          <View style={baseStyles.bottomRow}>
            <View style={baseStyles.column}>
              <Text style={baseStyles.value}>{formatCurrencyNoDecimals(totalInvestment)}</Text>
            </View>
            <View style={baseStyles.column}>
              <Text style={baseStyles.currentValue}>{formatCurrencyNoDecimals(currentValue)}</Text>
            </View>
            <View style={baseStyles.column}>
              <Text style={[
                baseStyles.value,
                { color: pl.amount >= 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {formatCurrencyNoDecimals(pl.amount)} {pl.percentage >= 0 ? '+' : ''}{pl.percentage?.toFixed(2)}%
              </Text>
            </View>
          </View>
          {/* Expanded details below the new card design */}
          {expanded && (
            <View style={baseStyles.expandedDetailsContainer}>
              <View style={baseStyles.investmentDetails}>
                <View style={baseStyles.bottomRow}>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Quantity</Text>
                    <Text style={baseStyles.value}>{transaction.quantity}</Text>
                  </View>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Avg. Price</Text>
                    <Text style={baseStyles.value}>{formatCurrencyNoDecimals(transaction.averagePrice)}</Text>
                  </View>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Current Price</Text>
                    <Text style={baseStyles.value}>
                      {currentData ? formatCurrencyNoDecimals(currentData.currentPrice) : '-'}
                    </Text>
                  </View>
                </View>
                {transaction.description && (
                  <View style={baseStyles.descriptionContainer}>
                    <Text style={baseStyles.label}>Notes</Text>
                    <Text style={baseStyles.description}>{transaction.description}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const PortfolioSummary = ({ transactions, stocksData }) => {
  const totalInvestment = transactions.reduce((sum, t) => sum + (t.quantity * t.averagePrice), 0);
  const currentValue = transactions.reduce((sum, t) => {
    const currentPrice = stocksData[t.symbol]?.currentPrice || t.averagePrice;
    return sum + (t.quantity * currentPrice);
  }, 0);
  
  const totalPL = currentValue - totalInvestment;
  const plPercentage = ((totalPL / totalInvestment) * 100);

  return (
    <Surface style={baseStyles.summaryCard}>
      <Text style={baseStyles.summaryTitle}>Portfolio Summary</Text>
      <View style={baseStyles.summaryRow}>
        <View style={baseStyles.summaryItem}>
          <Text style={baseStyles.summaryLabel}>Total Investment</Text>
          <Text style={baseStyles.summaryValue}>{formatCurrencyNoDecimals(totalInvestment)}</Text>
        </View>
        <View style={baseStyles.summaryItem}>
          <Text style={baseStyles.summaryLabel}>Current Value</Text>
          <Text style={baseStyles.summaryValue}>{formatCurrencyNoDecimals(currentValue)}</Text>
        </View>
      </View>
      <Divider style={baseStyles.divider} />
      <View style={baseStyles.summaryRow}>
        <View style={baseStyles.summaryItem}>
          <Text style={baseStyles.summaryLabel}>Total Gain/Loss</Text>
          <Text style={[
            baseStyles.summaryValue,
            { color: totalPL >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {formatCurrencyNoDecimals(totalPL)}
          </Text>
        </View>
        <View style={baseStyles.summaryItem}>
          <Text style={baseStyles.summaryLabel}>Returns</Text>
          <Text style={[
            baseStyles.summaryValue,
            { color: plPercentage >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {plPercentage.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Surface>
  );
};

const StocksScreen = ({ route, navigation }) => {
  const { investmentId } = route.params;
  const theme = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [stocksData, setStocksData] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'pl', 'value'

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  useEffect(() => {
    if (transactions.length > 0) {
      fetchAllStocksData();
    }
  }, [transactions]);

  const fetchAllStocksData = async () => {
    const newStocksData = {};
    for (const transaction of transactions) {
      try {
        const data = await stocksAPI.getStockDetails(transaction.symbol);
        newStocksData[transaction.symbol] = data;
      } catch (error) {
        console.error(`Error fetching data for ${transaction.symbol}:`, error);
      }
    }
    setStocksData(newStocksData);
  };

  const loadTransactions = async () => {
    try {
      const data = await AsyncStorage.getItem(`transactions_${investmentId}`);
      if (data) {
        const parsedTransactions = JSON.parse(data);
        setTransactions(parsedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllStocksData();
    setRefreshing(false);
  }, []);

  const getSortedTransactions = () => {
    return [...transactions].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'pl') {
        const apl = calculatePL(a);
        const bpl = calculatePL(b);
        return bpl - apl; // Higher profit first
      } else if (sortBy === 'value') {
        const aValue = a.quantity * (stocksData[a.symbol]?.currentPrice || a.averagePrice);
        const bValue = b.quantity * (stocksData[b.symbol]?.currentPrice || b.averagePrice);
        return bValue - aValue; // Higher value first
      }
      return 0;
    });
  };

  const calculatePL = (transaction) => {
    const currentPrice = stocksData[transaction.symbol]?.currentPrice || transaction.averagePrice;
    const currentValue = currentPrice * transaction.quantity;
    const investedValue = transaction.averagePrice * transaction.quantity;
    return currentValue - investedValue;
  };

  const handleDeleteTransaction = async (transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete ${transaction.name} transaction?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove transaction from the list
              const updatedTransactions = transactions.filter(t => t.id !== transaction.id);
              await AsyncStorage.setItem(
                `transactions_${investmentId}`,
                JSON.stringify(updatedTransactions)
              );

              // Update portfolio data
              const existingPortfolioData = await AsyncStorage.getItem('portfolioData');
              let portfolioData = JSON.parse(existingPortfolioData);

              // Subtract the investment amount
              const investmentAmount = transaction.quantity * transaction.averagePrice;
              portfolioData.investments[investmentId].total -= investmentAmount;
              portfolioData.investments[investmentId].count -= 1;
              portfolioData.totalInvestment -= investmentAmount;

              await AsyncStorage.setItem('portfolioData', JSON.stringify(portfolioData));

              // Update state
              setTransactions(updatedTransactions);
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert(
                'Error',
                'Failed to delete the transaction. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const dynamicStyles = StyleSheet.create({
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 0,
      borderRadius: 16,
      elevation: 4,
      backgroundColor: theme.colors.primary,
    }
  });

  const styles = {
    ...baseStyles,
    ...dynamicStyles
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {transactions.length > 0 ? (
            <>
              <PortfolioSummary transactions={transactions} stocksData={stocksData} />
              
              <View style={styles.sortContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Chip
                    selected={sortBy === 'name'}
                    onPress={() => setSortBy('name')}
                    style={styles.sortChip}
                  >
                    Sort by Name
                  </Chip>
                  <Chip
                    selected={sortBy === 'pl'}
                    onPress={() => setSortBy('pl')}
                    style={styles.sortChip}
                  >
                    Sort by P/L
                  </Chip>
                  <Chip
                    selected={sortBy === 'value'}
                    onPress={() => setSortBy('value')}
                    style={styles.sortChip}
                  >
                    Sort by Value
                  </Chip>
                </ScrollView>
              </View>

              {getSortedTransactions().map((transaction) => (
                <TransactionCard 
                  key={transaction.id} 
                  transaction={transaction}
                  onDelete={handleDeleteTransaction}
                />
              ))}
            </>
          ) : (
            <Surface style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No stocks added yet</Text>
            </Surface>
          )}
        </View>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddStock', { investmentId })}
      />
    </View>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  investmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContainer: {
    padding: 16,
  },
  topRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    position: 'relative',
  },
  logoContainer: {
    marginRight: 12,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
    width: '100%',
    paddingRight: 40, // Add padding to prevent overlap with delete button
  },
  topRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  stockName: {
    color: '#23272F',
    fontWeight: '500',
    fontSize: 14,
    width: '100%',
    marginRight: 0,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  dayChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dayChangeLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
    marginRight: 4,
  },
  dayChangeAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#23272F',
    marginRight: 2,
  },
  dayChangePercent: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  dayChangeArrow: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginTop: 8,
    marginBottom: 0,
  },
  labelColumn: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 0,
    gap: 0,
  },
  column: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  value: {
    color: '#23272F',
    fontWeight: '400',
    fontSize: 13,
  },
  currentValue: {
    color: '#23272F',
    fontWeight: '400',
    fontSize: 13,
  },
  expandedDetailsContainer: {
    paddingHorizontal: 0,
    paddingBottom: 12,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  investmentDetails: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  description: {
    fontSize: 14,
    color: '#444',
    fontStyle: 'italic',
  },
  summaryCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  divider: {
    marginVertical: 12,
  },
  sortContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sortChip: {
    marginHorizontal: 4,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
});

export default StocksScreen; 