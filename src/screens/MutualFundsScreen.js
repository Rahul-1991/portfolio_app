import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Divider, FAB, Surface, Text, useTheme } from 'react-native-paper';
import { formatCurrencyNoDecimals } from '../constants/investments';
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
            {formatCurrencyNoDecimals(portfolioSummary.totalInvestment)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Current Value</Text>
          <Text style={styles.summaryValue}>
            {formatCurrencyNoDecimals(portfolioSummary.currentValue)}
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
            {formatCurrencyNoDecimals(portfolioSummary.totalGain)}
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

    // Handle fund name display logic
    let fundNameDisplay;
    if (investment.schemeName && investment.schemeName.length > 39) {
      fundNameDisplay = (
        <Text style={[styles.fundName, { fontSize: 14, lineHeight: 18, fontWeight: '500' }]}> 
          {investment.schemeName.slice(0, 39)}{investment.schemeName.slice(39)}
        </Text>
      );
    } else {
      fundNameDisplay = (
        <Text style={[styles.fundName, { fontSize: 14, lineHeight: 18, fontWeight: '500' }]}> 
          {investment.schemeName}
        </Text>
      );
    }

    return (
      <Card 
        key={investment.schemeCode} 
        style={styles.investmentCard}
      >
        <TouchableOpacity
          onPress={() => setExpandedCard(isExpanded ? null : investment.schemeCode)}
        >
          <View style={styles.cardContainer}>
            {/* Top Row: Logo + (Fund Name + Day Change) */}
            <View style={styles.topRowContainer}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>
                    {investment.schemeName ? investment.schemeName.charAt(0) : '?'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.topRow}>
                  {fundNameDisplay}
                  <View style={styles.dayChangeContainer}>
                    <Text style={styles.dayChangeLabel}>1D change</Text>
                    <Text style={styles.dayChangeAmount}>
                      {formatCurrencyNoDecimals(investment.dayChangeAmount).replace(/\s(?=\d)/, '')}
                    </Text>
                    <Text> </Text>
                    <Text style={[
                      styles.dayChangePercent,
                      { color: investment.dayChangePercentage >= 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                      {investment.dayChangePercentage >= 0 ? '+' : ''}{investment.dayChangePercentage?.toFixed(2)}%
                    </Text>
                    <Text style={[
                      styles.dayChangeArrow,
                      { color: investment.dayChangePercentage >= 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                      {investment.dayChangeAmount >= 0 ? '▲' : '▼'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Label Row: Invested, Current Value, Gain/Loss (full width, left aligned) */}
            <View style={styles.labelRow}>
              <View style={styles.labelColumn}>
                <Text style={styles.label}>Invested</Text>
              </View>
              <View style={styles.labelColumn}>
                <Text style={styles.label}>Current Value</Text>
              </View>
              <View style={styles.labelColumn}>
                <Text style={styles.label}>Gain/ Loss</Text>
              </View>
            </View>
            {/* Value Row: Invested, Current Value, Gain/Loss (full width, left aligned) */}
            <View style={styles.bottomRow}>
              <View style={styles.column}>
                <Text style={styles.value}>{formatCurrencyNoDecimals(investment.totalInvestment)}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.currentValue}>{formatCurrencyNoDecimals(investment.currentValue)}</Text>
              </View>
              <View style={styles.column}>
                <Text style={[
                  styles.value,
                  { color: investment.gain >= 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {formatCurrencyNoDecimals(investment.gain)} {investment.gainPercentage >= 0 ? '+' : ''}{investment.gainPercentage?.toFixed(2)}%
                </Text>
              </View>
            </View>
            {/* Expanded details below the new card design */}
            {isExpanded && (
              <View style={styles.expandedDetailsContainer}>
                <View style={styles.investmentDetails}>
                  <View style={styles.bottomRow}>
                    <View style={styles.column}>
                      <Text style={styles.label}>Units</Text>
                      <Text style={styles.value}>{investment.totalUnits.toFixed(4)}</Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.label}>NAV</Text>
                      <Text style={styles.value}>{formatCurrencyNoDecimals(investment.currentNAV)}</Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.label}>Last Updated</Text>
                      <Text style={styles.value}>{investment.lastUpdated}</Text>
                    </View>
                  </View>
                </View>
                {investment.transactions.some(t => t.isSIP) && (
                  <View style={styles.sipBadge}>
                    <Text style={styles.sipBadgeText}>SIP Active</Text>
                  </View>
                )}
              </View>
            )}
          </View>
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
              {investments.map(renderInvestmentCard)}
            </>
          ) : (
            <Surface style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No mutual fund investments yet
              </Text>
            </Surface>
          )}
        </View>
      </ScrollView>

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('ImportMutualFund', { investmentId: 'mf' })}
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
  },
  topRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  fundName: {
    color: '#23272F',
    fontWeight: '500',
    fontSize: 14,
    width: '100%',
    marginRight: 0,
    lineHeight: 18,
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
});

export default MutualFundsScreen; 