import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, FAB, Surface, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../constants/investments';
import { cryptoAPI } from '../services/cryptoAPI';

const CryptocurrencyScreen = ({ navigation }) => {
  const theme = useTheme();
  const [investments, setInvestments] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalInvestment: 0,
    currentValue: 0,
    totalGain: 0,
    gainPercentage: 0,
    dayChange: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInvestments = async () => {
    try {
      const existingData = await AsyncStorage.getItem('transactions_crypto');
      if (existingData) {
        const transactions = JSON.parse(existingData);
        
        // Group transactions by coin ID
        const groupedInvestments = transactions.reduce((acc, transaction) => {
          if (!acc[transaction.coinId]) {
            acc[transaction.coinId] = {
              ...transaction,
              totalQuantity: 0,
              totalInvestment: 0,
              currentValue: 0,
              transactions: [],
            };
          }
          
          acc[transaction.coinId].totalQuantity += transaction.quantity;
          acc[transaction.coinId].totalInvestment += transaction.investmentAmount;
          acc[transaction.coinId].transactions.push(transaction);
          
          return acc;
        }, {});

        // Fetch current prices for all coins
        const coinIds = Object.keys(groupedInvestments);
        if (coinIds.length > 0) {
          const priceData = await cryptoAPI.getCurrentPrices(coinIds);
          
          // Calculate current values and gains
          const investmentsArray = Object.values(groupedInvestments).map(investment => {
            const coinData = priceData[investment.coinId];
            const currentPrice = coinData?.inr || 0;
            const currentValue = investment.totalQuantity * currentPrice;
            const gain = currentValue - investment.totalInvestment;
            const gainPercentage = (gain / investment.totalInvestment) * 100;
            const dayChange = coinData?.inr_24h_change || 0;
            const dayChangeAmount = (dayChange / 100) * currentValue;

            return {
              ...investment,
              currentPrice,
              currentValue,
              gain,
              gainPercentage,
              dayChange,
              dayChangeAmount
            };
          });

          // Calculate portfolio summary
          const summary = investmentsArray.reduce(
            (acc, investment) => {
              acc.totalInvestment += investment.totalInvestment;
              acc.currentValue += investment.currentValue;
              acc.dayChange += investment.dayChangeAmount;
              return acc;
            },
            { totalInvestment: 0, currentValue: 0, dayChange: 0 }
          );

          summary.totalGain = summary.currentValue - summary.totalInvestment;
          summary.gainPercentage = (summary.totalGain / summary.totalInvestment) * 100;

          setPortfolioSummary(summary);
          setInvestments(investmentsArray);
        } else {
          setInvestments([]);
          setPortfolioSummary({
            totalInvestment: 0,
            currentValue: 0,
            totalGain: 0,
            gainPercentage: 0,
            dayChange: 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading investments:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInvestments();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvestments();
    setRefreshing(false);
  }, []);

  const renderSummaryCard = () => (
    <Surface style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Portfolio Summary</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Investment</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(portfolioSummary.totalInvestment)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Current Value</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(portfolioSummary.currentValue)}
          </Text>
        </View>
      </View>
      <Divider style={styles.divider} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Gain/Loss</Text>
          <Text style={[
            styles.summaryValue,
            { color: portfolioSummary.totalGain >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {formatCurrency(portfolioSummary.totalGain)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Returns</Text>
          <Text style={[
            styles.summaryValue,
            { color: portfolioSummary.gainPercentage >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {portfolioSummary.gainPercentage.toFixed(2)}%
          </Text>
        </View>
      </View>
      <Divider style={styles.divider} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>24h Change</Text>
          <Text style={[
            styles.summaryValue,
            { color: portfolioSummary.dayChange >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {formatCurrency(portfolioSummary.dayChange)}
          </Text>
        </View>
      </View>
    </Surface>
  );

  const renderInvestmentCard = (investment) => {
    const isExpanded = expandedCard === investment.coinId;

    return (
      <Card 
        key={investment.coinId} 
        style={styles.investmentCard}
      >
        <TouchableOpacity
          onPress={() => setExpandedCard(isExpanded ? null : investment.coinId)}
        >
          <Card.Content>
            {!isExpanded ? (
              <View style={styles.collapsedContent}>
                <View style={styles.leftContent}>
                  <Text style={styles.coinName} numberOfLines={2}>
                    {investment.name}
                  </Text>
                  <Text style={styles.coinSymbol}>{investment.symbol}</Text>
                </View>
                <View style={styles.rightContent}>
                  <Text style={[
                    styles.currentValue,
                    { color: investment.currentValue >= investment.totalInvestment ? '#4CAF50' : '#F44336' }
                  ]}>
                    {formatCurrency(investment.currentValue)}
                  </Text>
                  <Text style={styles.investmentAmount}>
                    {formatCurrency(investment.totalInvestment)}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.expandedHeader}>
                  <Text style={styles.expandedCoinName}>{investment.name}</Text>
                  <Text style={styles.expandedCoinSymbol}>{investment.symbol}</Text>
                </View>
                
                <View style={styles.investmentDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Investment</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(investment.totalInvestment)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Current Value</Text>
                      <Text style={[
                        styles.detailValue,
                        { color: investment.currentValue >= investment.totalInvestment ? '#4CAF50' : '#F44336' }
                      ]}>
                        {formatCurrency(investment.currentValue)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Quantity</Text>
                      <Text style={styles.detailValue}>
                        {investment.totalQuantity.toFixed(8)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Current Price</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(investment.currentPrice)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>24h Change</Text>
                      <View style={styles.changeContainer}>
                        <Text style={[
                          styles.detailValue,
                          { color: investment.dayChange >= 0 ? '#4CAF50' : '#F44336' }
                        ]}>
                          {formatCurrency(investment.dayChangeAmount)}
                        </Text>
                        <Text style={[
                          styles.changePercentage,
                          { color: investment.dayChange >= 0 ? '#4CAF50' : '#F44336' }
                        ]}>
                          ({investment.dayChange >= 0 ? '+' : ''}{investment.dayChange.toFixed(2)}%)
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Overall Returns</Text>
                      <View style={styles.changeContainer}>
                        <Text style={[
                          styles.detailValue,
                          { color: investment.gainPercentage >= 0 ? '#4CAF50' : '#F44336' }
                        ]}>
                          {formatCurrency(investment.gain)}
                        </Text>
                        <Text style={[
                          styles.changePercentage,
                          { color: investment.gainPercentage >= 0 ? '#4CAF50' : '#F44336' }
                        ]}>
                          ({investment.gainPercentage >= 0 ? '+' : ''}{investment.gainPercentage.toFixed(2)}%)
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
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
          {investments.length > 0 ? (
            <>
              {renderSummaryCard()}
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('AddCrypto')}
                  style={[styles.actionButton, { marginRight: 8 }]}
                >
                  Add New Investment
                </Button>
              </View>
              {investments.map(renderInvestmentCard)}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('AddCrypto')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
  investmentCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  leftContent: {
    flex: 1,
    paddingRight: 16,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  coinName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
    flexShrink: 1,
    height: 24,
  },
  coinSymbol: {
    fontSize: 14,
    color: '#666',
    height: 20,
  },
  currentValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    height: 24,
  },
  investmentAmount: {
    fontSize: 14,
    color: '#666',
    height: 20,
  },
  investmentDetails: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 4,
  },
  changePercentage: {
    fontSize: 14,
    fontWeight: '500',
  },
  expandedHeader: {
    paddingVertical: 12,
  },
  expandedCoinName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  expandedCoinSymbol: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default CryptocurrencyScreen; 