import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, Surface, TextInput, useTheme } from 'react-native-paper';
import { formatCurrency } from '../constants/investments';
import { stocksAPI } from '../services/stocksAPI';

const AddStockScreen = ({ route, navigation }) => {
  const { investmentId } = route.params;
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetails, setStockDetails] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    quantity: '',
    averagePrice: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let timeoutId;
    if (searchQuery.length >= 2) {
      setIsSearching(true);
      timeoutId = setTimeout(async () => {
        try {
          const results = await stocksAPI.searchStocks(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setSearchResults([]);
    }
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedStock) {
      fetchStockDetails();
      const interval = setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        // Update during market hours (9:15 AM to 3:30 PM IST)
        if ((hours > 9 || (hours === 9 && minutes >= 15)) && (hours < 15 || (hours === 15 && minutes <= 30))) {
          fetchStockDetails();
        }
      }, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [selectedStock]);

  const fetchStockDetails = async () => {
    try {
      const details = await stocksAPI.getStockDetails(selectedStock.symbol);
      setStockDetails(details);
    } catch (error) {
      console.error('Error fetching stock details:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedStock) newErrors.stock = 'Please select a stock';
    if (!newTransaction.quantity) newErrors.quantity = 'Quantity is required';
    if (!newTransaction.averagePrice) newErrors.averagePrice = 'Average price is required';
    
    if (isNaN(newTransaction.quantity) || parseInt(newTransaction.quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    }
    if (isNaN(newTransaction.averagePrice) || parseFloat(newTransaction.averagePrice) <= 0) {
      newErrors.averagePrice = 'Please enter a valid price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setSearchQuery(stock.name);
    setSearchResults([]);
  };

  const calculateInvestmentDetails = () => {
    if (!newTransaction.quantity || !newTransaction.averagePrice) return null;
    
    const quantity = parseInt(newTransaction.quantity);
    const avgPrice = parseFloat(newTransaction.averagePrice);
    const totalInvestment = quantity * avgPrice;
    
    if (stockDetails) {
      const currentValue = quantity * stockDetails.currentPrice;
      const pl = currentValue - totalInvestment;
      const plPercentage = (pl / totalInvestment) * 100;
      
      return {
        totalInvestment,
        currentValue,
        pl,
        plPercentage
      };
    }
    
    return { totalInvestment };
  };

  const saveTransaction = async () => {
    if (!validateForm()) return;

    try {
      const transaction = {
        id: Date.now().toString(),
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        quantity: parseInt(newTransaction.quantity),
        averagePrice: parseFloat(newTransaction.averagePrice),
        description: newTransaction.description,
        investedOn: new Date().toISOString(),
        sector: selectedStock.sector,
        industry: selectedStock.industry
      };

      // Load existing transactions
      const existingData = await AsyncStorage.getItem(`transactions_${investmentId}`);
      const transactions = existingData ? JSON.parse(existingData) : [];
      
      // Add new transaction
      const updatedTransactions = [...transactions, transaction];
      await AsyncStorage.setItem(
        `transactions_${investmentId}`,
        JSON.stringify(updatedTransactions)
      );

      // Update portfolio data
      const existingPortfolioData = await AsyncStorage.getItem('portfolioData');
      let portfolioData = existingPortfolioData ? JSON.parse(existingPortfolioData) : {
        totalInvestment: 0,
        investments: {
          rd: { total: 0, count: 0 },
          fd: { total: 0, count: 0 },
          stocks: { total: 0, count: 0 },
          mf: { total: 0, count: 0 }
        }
      };

      const totalInvestment = transaction.quantity * transaction.averagePrice;
      portfolioData.investments[investmentId].total = (portfolioData.investments[investmentId].total || 0) + totalInvestment;
      portfolioData.investments[investmentId].count = (portfolioData.investments[investmentId].count || 0) + 1;
      portfolioData.totalInvestment = (portfolioData.totalInvestment || 0) + totalInvestment;

      await AsyncStorage.setItem('portfolioData', JSON.stringify(portfolioData));

      navigation.goBack();
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert(
        'Error',
        'Failed to save the transaction. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const investmentDetails = calculateInvestmentDetails();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Surface style={styles.searchContainer}>
            <TextInput
              label="Search Stocks"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.input}
              mode="outlined"
              error={!!errors.stock}
              left={<TextInput.Icon icon="magnify" />}
            />
            {errors.stock && (
              <HelperText type="error" visible={true}>
                {errors.stock}
              </HelperText>
            )}

            {isSearching && (
              <Text style={styles.searchingText}>Searching...</Text>
            )}

            {searchResults.length > 0 && !selectedStock && (
              <Surface style={styles.searchResults}>
                {searchResults.map((stock) => (
                  <Button
                    key={stock.symbol}
                    mode="text"
                    onPress={() => handleStockSelect(stock)}
                    style={styles.searchResultItem}
                  >
                    <Text style={styles.stockName}>{stock.name}</Text>
                    <Text style={styles.stockSymbol}>({stock.symbol})</Text>
                  </Button>
                ))}
              </Surface>
            )}
          </Surface>

          {selectedStock && (
            <>
              <Surface style={styles.stockInfo}>
                <Text style={styles.stockInfoTitle}>{selectedStock.name}</Text>
                <Text style={styles.stockInfoSubtitle}>{selectedStock.symbol} • {selectedStock.exchange}</Text>
                {stockDetails && (
                  <View style={styles.priceContainer}>
                    <Text style={styles.currentPrice}>
                      {formatCurrency(stockDetails.currentPrice)}
                    </Text>
                    <Text style={[
                      styles.priceChange,
                      { color: parseFloat(stockDetails.change) >= 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                      {stockDetails.change >= 0 ? '↑' : '↓'} {Math.abs(stockDetails.change)}
                      ({Math.abs(stockDetails.changePercent)}%)
                    </Text>
                  </View>
                )}
              </Surface>

              <Surface style={styles.inputContainer}>
                <TextInput
                  label="Quantity"
                  value={newTransaction.quantity}
                  onChangeText={(text) => setNewTransaction({ ...newTransaction, quantity: text })}
                  keyboardType="numeric"
                  style={styles.input}
                  mode="outlined"
                  error={!!errors.quantity}
                />
                {errors.quantity && (
                  <HelperText type="error" visible={true}>
                    {errors.quantity}
                  </HelperText>
                )}

                <TextInput
                  label="Average Buy Price"
                  value={newTransaction.averagePrice}
                  onChangeText={(text) => setNewTransaction({ ...newTransaction, averagePrice: text })}
                  keyboardType="numeric"
                  style={styles.input}
                  mode="outlined"
                  error={!!errors.averagePrice}
                />
                {errors.averagePrice && (
                  <HelperText type="error" visible={true}>
                    {errors.averagePrice}
                  </HelperText>
                )}

                <TextInput
                  label="Notes (Optional)"
                  value={newTransaction.description}
                  onChangeText={(text) => setNewTransaction({ ...newTransaction, description: text })}
                  style={[styles.input, styles.multilineInput]}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                />
              </Surface>

              {investmentDetails && (
                <Surface style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Investment Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Investment</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(investmentDetails.totalInvestment)}
                    </Text>
                  </View>
                  {stockDetails && (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Current Value</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(investmentDetails.currentValue)}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Profit/Loss</Text>
                        <Text style={[
                          styles.summaryValue,
                          { color: investmentDetails.pl >= 0 ? '#4CAF50' : '#F44336' }
                        ]}>
                          {formatCurrency(Math.abs(investmentDetails.pl))}
                          {' '}({Math.abs(investmentDetails.plPercentage).toFixed(2)}%)
                          {investmentDetails.pl >= 0 ? ' Profit' : ' Loss'}
                        </Text>
                      </View>
                    </>
                  )}
                </Surface>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={saveTransaction}
          style={styles.button}
        >
          Save
        </Button>
      </View>
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
  searchContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 80,
  },
  searchingText: {
    padding: 8,
    color: '#666',
    textAlign: 'center',
  },
  searchResults: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchResultItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'flex-start',
  },
  stockName: {
    fontSize: 14,
    color: '#1a1a1a',
    marginRight: 8,
  },
  stockSymbol: {
    fontSize: 14,
    color: '#666',
  },
  stockInfo: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  stockInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  stockInfoSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceContainer: {
    marginTop: 8,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  priceChange: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    minWidth: 100,
    marginLeft: 8,
  },
});

export default AddStockScreen; 