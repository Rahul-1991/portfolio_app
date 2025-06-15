import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, Surface, TextInput, useTheme } from 'react-native-paper';
import { formatCurrency, formatDate } from '../constants/investments';
import { mutualFundsAPI } from '../services/mutualFundsAPI';

const ImportMutualFundScreen = ({ route, navigation }) => {
  const { investmentId } = route.params;
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [fundDetails, setFundDetails] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [importData, setImportData] = useState({
    units: '',
    navPrice: '',
    investmentAmount: '',
    purchaseDate: new Date(),
    description: '',
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
    } catch (error) {
      console.error('Error fetching fund details:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedFund) newErrors.fund = 'Please select a mutual fund';
    if (!importData.units) newErrors.units = 'Number of units is required';
    if (!importData.navPrice) newErrors.navPrice = 'Purchase NAV is required';
    if (!importData.investmentAmount) newErrors.investmentAmount = 'Investment amount is required';
    
    if (isNaN(importData.units) || parseFloat(importData.units) <= 0) {
      newErrors.units = 'Please enter a valid number of units';
    }
    if (isNaN(importData.navPrice) || parseFloat(importData.navPrice) <= 0) {
      newErrors.navPrice = 'Please enter a valid NAV price';
    }
    if (isNaN(importData.investmentAmount) || parseFloat(importData.investmentAmount) <= 0) {
      newErrors.investmentAmount = 'Please enter a valid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFundSelect = (fund) => {
    setSelectedFund(fund);
    setSearchQuery(fund.schemeName);
    setSearchResults([]);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setImportData(prev => ({ ...prev, purchaseDate: selectedDate }));
    }
  };

  const calculateAmount = () => {
    if (!importData.units || !importData.navPrice) return '';
    const amount = parseFloat(importData.units) * parseFloat(importData.navPrice);
    return amount.toFixed(2); // Keep 2 decimal places for currency
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
        navPrice: parseFloat(parseFloat(importData.navPrice).toFixed(4)), // Limit NAV to 4 decimal places
        investmentAmount: Math.round(parseFloat(importData.investmentAmount)), // Round to nearest integer
        units: parseFloat(parseFloat(importData.units).toFixed(4)), // Limit units to 4 decimal places
        description: importData.description,
        investedOn: importData.purchaseDate.toISOString(),
        isImported: true
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

      portfolioData.investments[investmentId].total = (portfolioData.investments[investmentId].total || 0) + parseFloat(importData.investmentAmount);
      portfolioData.investments[investmentId].count = (portfolioData.investments[investmentId].count || 0) + 1;
      portfolioData.totalInvestment = (portfolioData.totalInvestment || 0) + parseFloat(importData.investmentAmount);

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
                      Current NAV: {formatCurrency(fundDetails.nav.currentNAV)}
                    </Text>
                    <Text style={styles.navDate}>as on {fundDetails.nav.date}</Text>
                  </View>
                )}
              </Surface>

              <Surface style={styles.inputContainer}>
                <TextInput
                  label="Number of Units"
                  value={importData.units}
                  onChangeText={(text) => {
                    const newUnits = text;
                    setImportData({ 
                      ...importData, 
                      units: newUnits,
                      investmentAmount: newUnits && importData.navPrice ? 
                        (parseFloat(newUnits) * parseFloat(importData.navPrice)).toFixed(2) : 
                        importData.investmentAmount
                    });
                  }}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  mode="outlined"
                  error={!!errors.units}
                />
                {errors.units && (
                  <HelperText type="error" visible={true}>
                    {errors.units}
                  </HelperText>
                )}

                <TextInput
                  label="Purchase NAV"
                  value={importData.navPrice}
                  onChangeText={(text) => {
                    const newNavPrice = text;
                    setImportData({ 
                      ...importData, 
                      navPrice: newNavPrice,
                      investmentAmount: newNavPrice && importData.units ? 
                        (parseFloat(importData.units) * parseFloat(newNavPrice)).toFixed(2) : 
                        importData.investmentAmount
                    });
                  }}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  mode="outlined"
                  error={!!errors.navPrice}
                />
                {errors.navPrice && (
                  <HelperText type="error" visible={true}>
                    {errors.navPrice}
                  </HelperText>
                )}

                <TextInput
                  label="Investment Amount"
                  value={importData.investmentAmount}
                  onChangeText={(text) => setImportData({ ...importData, investmentAmount: text })}
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

                <Button
                  mode="outlined"
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateButton}
                >
                  Purchase Date: {formatDate(importData.purchaseDate)}
                </Button>

                <TextInput
                  label="Notes (Optional)"
                  value={importData.description}
                  onChangeText={(text) => setImportData({ ...importData, description: text })}
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
          Import
        </Button>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={importData.purchaseDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
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
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
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
  dateButton: {
    marginVertical: 8,
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

export default ImportMutualFundScreen; 