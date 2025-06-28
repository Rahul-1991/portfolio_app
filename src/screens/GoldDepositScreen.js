import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Divider, FAB, Surface, useTheme } from 'react-native-paper';
import { formatCurrencyNoDecimals } from '../constants/investments';
import getCurrentGoldPrice from '../services/goldAPI';

const TransactionCard = ({ transaction, onDelete, currentGoldPrice, goldPriceData }) => {
  const [expanded, setExpanded] = useState(false);

  const calculatePL = () => {
    if (!currentGoldPrice) {
      // Fallback to invested amount if no current price available
      return {
        amount: 0,
        percentage: 0,
        currentValue: transaction.investmentAmount
      };
    }

    const pureGoldWeight = (transaction.weight * transaction.purity) / 100;
    const currentValue = pureGoldWeight * (currentGoldPrice / 10); // Convert from 10g price to per gram
    const investedValue = transaction.investmentAmount;
    const plAmount = currentValue - investedValue;
    const plPercentage = (plAmount / investedValue) * 100;
    return {
      amount: plAmount,
      percentage: plPercentage,
      currentValue: currentValue
    };
  };

  const calculateDayChange = () => {
    if (!currentGoldPrice) {
      return { amount: 0, percentage: 0 };
    }
    // For demo purposes, using a small percentage change
    const dayChangePercentage = 0.5; // 0.5% change
    const dayChangeAmount = pl.currentValue * (dayChangePercentage / 100);
    return {
      amount: dayChangeAmount,
      percentage: dayChangePercentage
    };
  };

  const pl = calculatePL();
  const dayChange = calculateDayChange();
  const hasValidDayChange = currentGoldPrice && dayChange.amount !== 0;

  return (
    <Card style={baseStyles.investmentCard}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={baseStyles.cardContainer}>
          {/* Top Row: Logo + (Jewelry Name + Day Change) */}
          <View style={baseStyles.topRowContainer}>
            <View style={baseStyles.logoContainer}>
              <View style={[baseStyles.logoCircle, { backgroundColor: '#FFD700' }]}>
                <MaterialCommunityIcons name="gold" size={24} color="#B8860B" />
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={baseStyles.stockName}>{transaction.jewelryType}</Text>
                <View style={baseStyles.dayChangeRow}>
                  <Text style={baseStyles.dayChangeLabel}>1D change</Text>
                  <Text style={baseStyles.dayChangeAmount}>
                    {hasValidDayChange ? formatCurrencyNoDecimals(dayChange.amount).replace(/\s(?=\d)/, '') : 'N/A'}
                  </Text>
                  <Text style={[
                    baseStyles.dayChangePercent,
                    { color: hasValidDayChange ? (dayChange.percentage >= 0 ? '#4CAF50' : '#F44336') : '#888' }
                  ]}>
                    {hasValidDayChange ? (dayChange.percentage >= 0 ? '+' : '') + dayChange.percentage?.toFixed(2) + '%' : 'N/A'}
                  </Text>
                  <Text style={[
                    baseStyles.dayChangeArrow,
                    { color: hasValidDayChange ? (dayChange.percentage >= 0 ? '#4CAF50' : '#F44336') : '#888' }
                  ]}>
                    {hasValidDayChange ? (dayChange.percentage >= 0 ? '▲' : '▼') : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={baseStyles.deleteButton}
                onPress={() => onDelete(transaction)}
              >
                <View style={baseStyles.deleteCircle}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#F44336" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          {/* Label Row: Invested, Current Value, Gain/Loss */}
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
          {/* Value Row: Invested, Current Value, Gain/Loss */}
          <View style={baseStyles.bottomRow}>
            <View style={baseStyles.column}>
              <Text style={baseStyles.value}>{formatCurrencyNoDecimals(transaction.investmentAmount)}</Text>
            </View>
            <View style={baseStyles.column}>
              <Text style={baseStyles.currentValue}>{formatCurrencyNoDecimals(pl.currentValue)}</Text>
            </View>
            <View style={baseStyles.column}>
              <View style={baseStyles.gainLossContainer}>
                <Text style={[
                  baseStyles.value,
                  { color: pl.amount >= 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {formatCurrencyNoDecimals(pl.amount)}
                </Text>
                <Text style={[
                  baseStyles.percentageValue,
                  { color: pl.amount >= 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {pl.percentage >= 0 ? '+' : ''}{pl.percentage?.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
          {/* Expanded details */}
          {expanded && (
            <View style={baseStyles.expandedDetailsContainer}>
              <View style={baseStyles.investmentDetails}>
                <View style={baseStyles.bottomRow}>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Weight</Text>
                    <Text style={baseStyles.value}>{transaction.weight}g</Text>
                  </View>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Purity</Text>
                    <Text style={baseStyles.value}>{transaction.purity}%</Text>
                  </View>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Pure Gold</Text>
                    <Text style={baseStyles.value}>
                      {((transaction.weight * transaction.purity) / 100).toFixed(2)}g
                    </Text>
                  </View>
                </View>
                <View style={baseStyles.bottomRow}>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Purchase Date</Text>
                    <Text style={baseStyles.value}>{new Date(transaction.purchaseDate).toLocaleDateString()}</Text>
                  </View>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Hallmark</Text>
                    <Text style={baseStyles.value}>{transaction.hallmark}</Text>
                  </View>
                  <View style={baseStyles.column}>
                    <Text style={baseStyles.label}>Store</Text>
                    <Text style={baseStyles.value}>{transaction.store}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const PortfolioSummary = ({ transactions, currentGoldPrice, goldPriceData }) => {
  const totalInvestment = transactions.reduce((sum, t) => sum + t.investmentAmount, 0);
  
  // Calculate current value based on real-time gold price
  const currentValue = transactions.reduce((sum, t) => {
    if (!currentGoldPrice) {
      return sum + t.investmentAmount; // Fallback to invested amount
    }
    const pureGoldWeight = (t.weight * t.purity) / 100;
    return sum + (pureGoldWeight * (currentGoldPrice / 10)); // Convert from 10g price to per gram
  }, 0);
  
  const totalPL = currentValue - totalInvestment;
  const plPercentage = totalInvestment > 0 ? ((totalPL / totalInvestment) * 100) : 0;

  // Calculate total day change for portfolio
  const totalDayChange = transactions.reduce((sum, t) => {
    if (!goldPriceData || !currentGoldPrice) {
      return sum;
    }
    const pureGoldWeight = (t.weight * t.purity) / 100;
    return sum + (pureGoldWeight * (goldPriceData.price_change / 10));
  }, 0);

  return (
    <Surface style={baseStyles.summaryCard}>
      <Text style={baseStyles.summaryTitle}>Portfolio Summary</Text>
      {currentGoldPrice && (
        <Text style={baseStyles.goldPriceInfo}>
          Current Gold Price: {formatCurrencyNoDecimals(currentGoldPrice)} per 10g (24K)
          {typeof goldPriceData?.price_change === 'number' && !isNaN(goldPriceData.price_change) && (
            <Text style={[
              baseStyles.goldPriceChange,
              { color: goldPriceData.price_change >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              {' '}({goldPriceData.price_change >= 0 ? '+' : ''}{formatCurrencyNoDecimals(goldPriceData.price_change)})
            </Text>
          )}
        </Text>
      )}
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

const GoldDepositScreen = ({ route, navigation }) => {
  const { investmentId } = route.params;
  const theme = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'pl', 'value'
  const [currentGoldPrice, setCurrentGoldPrice] = useState(null);
  const [goldPriceData, setGoldPriceData] = useState(null);
  const [loadingGoldPrice, setLoadingGoldPrice] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      fetchGoldPrice();
    }, [])
  );

  const fetchGoldPrice = async () => {
    setLoadingGoldPrice(true);
    try {
      const goldData = await getCurrentGoldPrice();
      setCurrentGoldPrice(goldData.price_per_10g_today);
      setGoldPriceData(goldData);
      console.log('✅ Gold price fetched:', goldData.price_per_10g_today, 'Change:', goldData.price_change);
    } catch (error) {
      console.error('❌ Error fetching gold price:', error);
      // Keep the previous price or use fallback
      if (!currentGoldPrice) {
        setCurrentGoldPrice(65000); // Fallback price per 10g
      }
    } finally {
      setLoadingGoldPrice(false);
    }
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
    await Promise.all([fetchGoldPrice(), loadTransactions()]);
    setRefreshing(false);
  }, []);

  const getSortedTransactions = () => {
    return [...transactions].sort((a, b) => {
      if (sortBy === 'name') {
        return a.jewelryType.localeCompare(b.jewelryType);
      } else if (sortBy === 'pl') {
        const apl = calculatePL(a);
        const bpl = calculatePL(b);
        return bpl - apl; // Higher profit first
      } else if (sortBy === 'value') {
        const aValue = calculateCurrentValue(a);
        const bValue = calculateCurrentValue(b);
        return bValue - aValue; // Higher value first
      }
      return 0;
    });
  };

  const calculatePL = (transaction) => {
    const currentValue = calculateCurrentValue(transaction);
    return currentValue - transaction.investmentAmount;
  };

  const calculateCurrentValue = (transaction) => {
    if (!currentGoldPrice) {
      return transaction.investmentAmount; // Fallback to invested amount
    }
    const pureGoldWeight = (transaction.weight * transaction.purity) / 100;
    return pureGoldWeight * (currentGoldPrice / 10); // Convert from 10g price to per gram
  };

  const handleDeleteTransaction = async (transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete ${transaction.jewelryType} transaction?`,
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
              if (existingPortfolioData) {
                let portfolioData = JSON.parse(existingPortfolioData);

                // Subtract the investment amount
                portfolioData.investments[investmentId].total -= transaction.investmentAmount;
                portfolioData.investments[investmentId].count -= 1;
                portfolioData.totalInvestment -= transaction.investmentAmount;

                await AsyncStorage.setItem('portfolioData', JSON.stringify(portfolioData));
              }

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
      backgroundColor: '#FFD700',
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
              <PortfolioSummary transactions={transactions} currentGoldPrice={currentGoldPrice} goldPriceData={goldPriceData} />
              
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

              {getSortedTransactions().map((transaction, index) => (
                <TransactionCard
                  key={transaction.id || index}
                  transaction={transaction}
                  onDelete={handleDeleteTransaction}
                  currentGoldPrice={currentGoldPrice}
                  goldPriceData={goldPriceData}
                />
              ))}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="gold" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No gold deposits added yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add your first gold deposit</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddGold')}
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
  summaryCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  goldPriceInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  goldPriceChange: {
    fontWeight: '500',
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
  },
  sortChip: {
    marginRight: 8,
  },
  investmentCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardContainer: {
    padding: 16,
  },
  topRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logoContainer: {
    marginRight: 12,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFD700',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B8860B',
  },
  cardContent: {
    paddingVertical: 0,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 0,
  },
  dayChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dayChangeLabel: {
    fontSize: 10,
    color: '#666',
    marginRight: 4,
  },
  dayChangeAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1a1a',
    marginRight: 4,
  },
  dayChangePercent: {
    fontSize: 10,
    color: '#666',
    marginRight: 2,
  },
  dayChangeArrow: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 0,
  },
  deleteCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  labelColumn: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  column: {
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  currentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageValue: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  expandedDetailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  investmentDetails: {
    gap: 8,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  description: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default GoldDepositScreen; 