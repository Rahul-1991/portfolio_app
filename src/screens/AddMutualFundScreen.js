import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, Surface, Switch, TextInput, useTheme } from 'react-native-paper';
import { formatCurrency } from '../constants/investments';
import { mutualFundsAPI } from '../services/mutualFundsAPI';

const AddMutualFundScreen = ({ route, navigation }) => {
  const { investmentId } = route.params;
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [fundDetails, setFundDetails] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSIP, setIsSIP] = useState(false);
  
  const [newTransaction, setNewTransaction] = useState({
    units: '',
    navPrice: '',
    investmentAmount: '',
    description: '',
    // SIP specific fields
    sipAmount: '',
    sipDate: '',
    sipFrequency: 'Monthly', // Default to monthly
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let timeoutId;
    if (searchQuery.length >= 3) {
      setIsSearching(true);
      timeoutId = setTimeout(async () => {
        try {
          const results = await mutualFundsAPI.searchMutualFunds(searchQuery);
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
    if (selectedFund) {
      fetchFundDetails();
    }
  }, [selectedFund]);

  const fetchFundDetails = async () => {
    try {
      const details = await mutualFundsAPI.getFundDetails(selectedFund.schemeCode);
      setFundDetails(details);
      // Pre-fill NAV price with current NAV
      setNewTransaction(prev => ({
        ...prev,
        navPrice: details.nav.currentNAV.toString()
      }));
    } catch (error) {
      console.error('Error fetching fund details:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedFund) newErrors.fund = 'Please select a mutual fund';
    
    if (isSIP) {
      if (!newTransaction.sipAmount) newErrors.sipAmount = 'SIP amount is required';
      if (!newTransaction.sipDate) newErrors.sipDate = 'SIP date is required';
      if (isNaN(newTransaction.sipAmount) || parseFloat(newTransaction.sipAmount) <= 0) {
        newErrors.sipAmount = 'Please enter a valid SIP amount';
      }
    } else {
      if (!newTransaction.investmentAmount) newErrors.investmentAmount = 'Investment amount is required';
      if (isNaN(newTransaction.investmentAmount) || parseFloat(newTransaction.investmentAmount) <= 0) {
        newErrors.investmentAmount = 'Please enter a valid amount';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFundSelect = (fund) => {
    setSelectedFund(fund);
    setSearchQuery(fund.schemeName);
    setSearchResults([]);
  };

  const calculateUnits = () => {
    if (!newTransaction.investmentAmount || !newTransaction.navPrice) return '';
    const amount = parseFloat(newTransaction.investmentAmount);
    const nav = parseFloat(newTransaction.navPrice);
    return (amount / nav).toFixed(4);
  };

  const saveTransaction = async () => {
    if (!validateForm()) return;

    try {
      const transaction = {
        id: Date.now().toString(),
        schemeCode: selectedFund.schemeCode,
        schemeName: selectedFund.schemeName,
        fundHouse: selectedFund.fundHouse,
        schemeType: selectedFund.schemeType,
        schemeCategory: selectedFund.schemeCategory,
        navPrice: parseFloat(newTransaction.navPrice),
        investmentAmount: parseFloat(newTransaction.investmentAmount),
        units: parseFloat(calculateUnits()),
        description: newTransaction.description,
        investedOn: new Date().toISOString(),
        isSIP: isSIP,
        ...(isSIP && {
          sipDetails: {
            amount: parseFloat(newTransaction.sipAmount),
            date: newTransaction.sipDate,
            frequency: newTransaction.sipFrequency,
            status: 'Active'
          }
        })
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

      const investmentAmount = isSIP ? parseFloat(newTransaction.sipAmount) : parseFloat(newTransaction.investmentAmount);
      portfolioData.investments[investmentId].total = (portfolioData.investments[investmentId].total || 0) + investmentAmount;
      portfolioData.investments[investmentId].count = (portfolioData.investments[investmentId].count || 0) + 1;
      portfolioData.totalInvestment = (portfolioData.totalInvestment || 0) + investmentAmount;

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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Surface style={styles.searchContainer}>
            <TextInput
              label="Search Mutual Funds"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.input}
              mode="outlined"
              error={!!errors.fund}
              left={<TextInput.Icon icon="magnify" />}
            />
            {errors.fund && (
              <HelperText type="error" visible={true}>
                {errors.fund}
              </HelperText>
            )}

            {isSearching && (
              <Text style={styles.searchingText}>Searching...</Text>
            )}

            {searchResults.length > 0 && !selectedFund && (
              <Surface style={styles.searchResults}>
                {searchResults.map((fund) => (
                  <Button
                    key={fund.schemeCode}
                    mode="text"
                    onPress={() => handleFundSelect(fund)}
                    style={styles.searchResultItem}
                  >
                    <View style={styles.fundInfo}>
                      <Text style={styles.fundName}>{fund.schemeName}</Text>
                      <Text style={styles.fundHouse}>{fund.fundHouse}</Text>
                      <Text style={styles.fundCategory}>{fund.schemeCategory}</Text>
                    </View>
                  </Button>
                ))}
              </Surface>
            )}
          </Surface>

          {selectedFund && (
            <>
              <Surface style={styles.fundInfo}>
                <Text style={styles.fundInfoTitle}>{selectedFund.schemeName}</Text>
                <Text style={styles.fundInfoSubtitle}>
                  {selectedFund.fundHouse} • {selectedFund.schemeCategory}
                </Text>
                {fundDetails && (
                  <View style={styles.navContainer}>
                    <Text style={styles.currentNAV}>
                      {formatCurrency(fundDetails.nav.currentNAV)}
                    </Text>
                    <Text style={[
                      styles.navChange,
                      { color: fundDetails.nav.change >= 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                      {fundDetails.nav.change >= 0 ? '↑' : '↓'} {Math.abs(fundDetails.nav.change)}
                      ({Math.abs(fundDetails.nav.changePercent)}%)
                    </Text>
                    <Text style={styles.navDate}>NAV as on {fundDetails.nav.date}</Text>
                  </View>
                )}
              </Surface>

              <Surface style={styles.inputContainer}>
                <View style={styles.sipSwitch}>
                  <Text style={styles.sipLabel}>SIP Investment</Text>
                  <Switch
                    value={isSIP}
                    onValueChange={setIsSIP}
                  />
                </View>

                {isSIP ? (
                  <>
                    <TextInput
                      label="Monthly SIP Amount"
                      value={newTransaction.sipAmount}
                      onChangeText={(text) => setNewTransaction({ ...newTransaction, sipAmount: text })}
                      keyboardType="numeric"
                      style={styles.input}
                      mode="outlined"
                      error={!!errors.sipAmount}
                    />
                    {errors.sipAmount && (
                      <HelperText type="error" visible={true}>
                        {errors.sipAmount}
                      </HelperText>
                    )}

                    <TextInput
                      label="SIP Date (1-28)"
                      value={newTransaction.sipDate}
                      onChangeText={(text) => setNewTransaction({ ...newTransaction, sipDate: text })}
                      keyboardType="numeric"
                      style={styles.input}
                      mode="outlined"
                      error={!!errors.sipDate}
                    />
                    {errors.sipDate && (
                      <HelperText type="error" visible={true}>
                        {errors.sipDate}
                      </HelperText>
                    )}
                  </>
                ) : (
                  <>
                    <TextInput
                      label="Investment Amount"
                      value={newTransaction.investmentAmount}
                      onChangeText={(text) => setNewTransaction({ ...newTransaction, investmentAmount: text })}
                      keyboardType="numeric"
                      style={styles.input}
                      mode="outlined"
                      error={!!errors.investmentAmount}
                    />
                    {errors.investmentAmount && (
                      <HelperText type="error" visible={true}>
                        {errors.investmentAmount}
                      </HelperText>
                    )}

                    <TextInput
                      label="NAV"
                      value={newTransaction.navPrice}
                      onChangeText={(text) => setNewTransaction({ ...newTransaction, navPrice: text })}
                      keyboardType="numeric"
                      style={styles.input}
                      mode="outlined"
                      disabled
                    />

                    <TextInput
                      label="Units (Calculated)"
                      value={calculateUnits()}
                      style={styles.input}
                      mode="outlined"
                      disabled
                    />
                  </>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fundInfo: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  fundName: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  fundHouse: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  fundCategory: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  fundInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  fundInfoSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  navContainer: {
    marginTop: 8,
  },
  currentNAV: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  navChange: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  navDate: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  sipSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  sipLabel: {
    fontSize: 16,
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

export default AddMutualFundScreen; 