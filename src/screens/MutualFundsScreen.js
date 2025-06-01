import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, FAB, Surface, Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../constants/investments';
import { mutualFundsAPI } from '../services/mutualFundsAPI';

const MutualFundsScreen = ({ navigation }) => {
  const theme = useTheme();
  const [investments, setInvestments] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalInvestment: 0,
    currentValue: 0,
    totalGain: 0,
    gainPercentage: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInvestments = async () => {
    try {
      const existingData = await AsyncStorage.getItem('transactions_mf');
      if (existingData) {
        const transactions = JSON.parse(existingData);
        
        // Group transactions by scheme code
        const groupedInvestments = transactions.reduce((acc, transaction) => {
          if (!acc[transaction.schemeCode]) {
            acc[transaction.schemeCode] = {
              ...transaction,
              totalUnits: 0,
              totalInvestment: 0,
              currentValue: 0,
              transactions: [],
            };
          }
          
          acc[transaction.schemeCode].totalUnits += transaction.units;
          acc[transaction.schemeCode].totalInvestment += transaction.investmentAmount;
          acc[transaction.schemeCode].transactions.push(transaction);
          
          return acc;
        }, {});

        // Fetch current NAV for each investment
        const investmentsArray = await Promise.all(
          Object.values(groupedInvestments).map(async (investment) => {
            try {
              const fundDetails = await mutualFundsAPI.getFundDetails(investment.schemeCode);
              const currentValue = investment.totalUnits * fundDetails.nav.currentNAV;
              const gain = currentValue - investment.totalInvestment;
              const gainPercentage = (gain / investment.totalInvestment) * 100;

              // Calculate day change amount based on units
              const dayChangeAmount = investment.totalUnits * fundDetails.nav.change;
              const dayChangePercentage = fundDetails.nav.changePercent;

              return {
                ...investment,
                currentNAV: fundDetails.nav.currentNAV,
                currentValue,
                gain,
                gainPercentage,
                dayChangeAmount,
                dayChangePercentage,
                lastUpdated: fundDetails.nav.date,
              };
            } catch (error) {
              console.error('Error fetching NAV for scheme:', investment.schemeCode, error);
              return investment;
            }
          })
        );

        // Calculate portfolio summary
        const summary = investmentsArray.reduce(
          (acc, investment) => {
            acc.totalInvestment += investment.totalInvestment;
            acc.currentValue += investment.currentValue || 0;
            return acc;
          },
          { totalInvestment: 0, currentValue: 0 }
        );

        summary.totalGain = summary.currentValue - summary.totalInvestment;
        summary.gainPercentage = (summary.totalGain / summary.totalInvestment) * 100;

        setPortfolioSummary(summary);
        setInvestments(investmentsArray);
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
    </Surface>
  );

  const renderInvestmentCard = (investment) => {
    const isExpanded = expandedCard === investment.schemeCode;

    return (
      <Card 
        key={investment.schemeCode} 
        style={styles.investmentCard}
      >
        <TouchableOpacity
          onPress={() => setExpandedCard(isExpanded ? null : investment.schemeCode)}
        >
          <Card.Content>
            {!isExpanded ? (
              <View style={styles.collapsedContent}>
                <View style={styles.leftContent}>
                  <Text style={styles.schemeName} numberOfLines={2}>
                    {investment.schemeName}
                  </Text>
                  <Text style={styles.fundHouse}>{investment.fundHouse}</Text>
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
                  <Text style={styles.expandedSchemeName}>{investment.schemeName}</Text>
                  <Text style={styles.expandedFundHouse}>{investment.fundHouse}</Text>
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
                      <Text style={styles.detailLabel}>Units</Text>
                      <Text style={styles.detailValue}>
                        {investment.totalUnits.toFixed(4)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>NAV</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(investment.currentNAV)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Day Change</Text>
                      {investment.dayChangeAmount && (
                        <View style={styles.changeContainer}>
                          <Text style={[
                            styles.detailValue,
                            { color: investment.dayChangeAmount >= 0 ? '#4CAF50' : '#F44336' }
                          ]}>
                            {formatCurrency(investment.dayChangeAmount)}
                          </Text>
                          <Text style={[
                            styles.changePercentage,
                            { color: investment.dayChangeAmount >= 0 ? '#4CAF50' : '#F44336' }
                          ]}>
                            ({investment.dayChangePercentage >= 0 ? '+' : ''}{investment.dayChangePercentage.toFixed(2)}%)
                          </Text>
                        </View>
                      )}
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

                {investment.transactions.some(t => t.isSIP) && (
                  <View style={styles.sipBadge}>
                    <Text style={styles.sipBadgeText}>SIP Active</Text>
                  </View>
                )}
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
          {renderSummaryCard()}
          
          {investments.length > 0 ? (
            <>
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('AddMutualFund', { investmentId: 'mf' })}
                  style={[styles.actionButton, { marginRight: 8 }]}
                >
                  Add New Investment
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('ImportMutualFund', { investmentId: 'mf' })}
                  style={styles.actionButton}
                >
                  Import Existing
                </Button>
              </View>
              {investments.map(renderInvestmentCard)}
            </>
          ) : (
            <Surface style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No mutual fund investments yet
              </Text>
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('AddMutualFund', { investmentId: 'mf' })}
                  style={[styles.actionButton, { marginRight: 8 }]}
                >
                  Add New Investment
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('ImportMutualFund', { investmentId: 'mf' })}
                  style={styles.actionButton}
                >
                  Import Existing
                </Button>
              </View>
            </Surface>
          )}
        </View>
      </ScrollView>

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('AddMutualFund', { investmentId: 'mf' })}
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
  schemeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
    flexShrink: 1,
    height: 24,
  },
  fundHouse: {
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
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 12,
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
  sipBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sipBadgeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
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
    paddingTop: 12,
    paddingBottom: 0,
  },
  expandedSchemeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  expandedFundHouse: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
});

export default MutualFundsScreen; 