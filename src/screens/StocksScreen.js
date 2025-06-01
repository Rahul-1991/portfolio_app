import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Divider, FAB, Surface, useTheme } from 'react-native-paper';
import { formatCurrency } from '../constants/investments';
import { stocksAPI } from '../services/stocksAPI';

const TransactionCard = ({ transaction }) => {
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
      amount: plAmount.toFixed(2),
      percentage: plPercentage.toFixed(2)
    };
  };

  const pl = calculatePL();

  return (
    <Card style={baseStyles.card}>
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={baseStyles.touchable}
      >
        <Card.Content style={baseStyles.cardContent}>
          <View style={baseStyles.headerContainer}>
            <View style={baseStyles.headerLeft}>
              <Text style={baseStyles.title}>{transaction.name}</Text>
              <Text style={baseStyles.subtitle}>{transaction.symbol}</Text>
            </View>
            <View style={baseStyles.headerRight}>
              {currentData && (
                <>
                  <Text style={baseStyles.price}>{formatCurrency(currentData.currentPrice)}</Text>
                  <Text style={[
                    baseStyles.change,
                    { color: currentData.change >= 0 ? '#4CAF50' : '#F44336' }
                  ]}>
                    {currentData.change >= 0 ? '↑' : '↓'} {Math.abs(currentData.change)}
                    ({Math.abs(currentData.changePercent)}%)
                  </Text>
                </>
              )}
            </View>
          </View>

          {expanded && (
            <View style={baseStyles.expandedContent}>
              <Divider style={baseStyles.divider} />
              <Surface style={baseStyles.detailsContainer}>
                <View style={baseStyles.detailRow}>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Quantity</Text>
                    <Text style={baseStyles.value}>{transaction.quantity}</Text>
                  </View>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Avg. Buy Price</Text>
                    <Text style={baseStyles.value}>{formatCurrency(transaction.averagePrice)}</Text>
                  </View>
                </View>

                <View style={baseStyles.detailRow}>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Total Investment</Text>
                    <Text style={baseStyles.value}>
                      {formatCurrency(transaction.quantity * transaction.averagePrice)}
                    </Text>
                  </View>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Current Value</Text>
                    <Text style={baseStyles.value}>
                      {currentData ? formatCurrency(currentData.currentPrice * transaction.quantity) : '-'}
                    </Text>
                  </View>
                </View>

                <View style={baseStyles.detailRow}>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Profit/Loss</Text>
                    <Text style={[
                      baseStyles.value,
                      { color: pl.amount >= 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                      {formatCurrency(Math.abs(pl.amount))} ({Math.abs(pl.percentage)}%)
                      {pl.amount >= 0 ? ' Profit' : ' Loss'}
                    </Text>
                  </View>
                </View>

                {currentData && (
                  <View style={baseStyles.detailRow}>
                    <View style={baseStyles.detailItem}>
                      <Text style={baseStyles.label}>Day's Range</Text>
                      <Text style={baseStyles.value}>
                        {formatCurrency(currentData.dayLow)} - {formatCurrency(currentData.dayHigh)}
                      </Text>
                    </View>
                  </View>
                )}

                {transaction.description && (
                  <View style={baseStyles.descriptionContainer}>
                    <Text style={baseStyles.label}>Notes</Text>
                    <Text style={baseStyles.description}>{transaction.description}</Text>
                  </View>
                )}
              </Surface>
            </View>
          )}
        </Card.Content>
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
  const plPercentage = ((totalPL / totalInvestment) * 100).toFixed(2);

  return (
    <Surface style={baseStyles.summaryContainer}>
      <Text style={baseStyles.summaryTitle}>Portfolio Summary</Text>
      <View style={baseStyles.summaryContent}>
        <View style={baseStyles.summaryRow}>
          <View style={baseStyles.summaryItem}>
            <Text style={baseStyles.summaryLabel}>Total Investment</Text>
            <Text style={baseStyles.summaryValue}>{formatCurrency(totalInvestment)}</Text>
          </View>
          <View style={baseStyles.summaryItem}>
            <Text style={baseStyles.summaryLabel}>Current Value</Text>
            <Text style={baseStyles.summaryValue}>{formatCurrency(currentValue)}</Text>
          </View>
        </View>
        <View style={baseStyles.summaryRow}>
          <View style={baseStyles.summaryItem}>
            <Text style={baseStyles.summaryLabel}>Overall Returns</Text>
            <Text style={[
              baseStyles.summaryValue,
              { color: totalPL >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              {formatCurrency(Math.abs(totalPL))}
              {' '}({Math.abs(plPercentage)}%)
              {totalPL >= 0 ? ' Profit' : ' Loss'}
            </Text>
          </View>
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

  useEffect(() => {
    loadTransactions();
  }, []);

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
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No stocks added yet</Text>
          </View>
        )}
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
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  touchable: {
    width: '100%',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  change: {
    fontSize: 14,
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    backgroundColor: '#eee',
    height: 1,
    marginBottom: 16,
  },
  detailsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
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
  summaryContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sortContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sortChip: {
    marginHorizontal: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
});

export default StocksScreen; 