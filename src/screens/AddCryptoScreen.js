import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, List, Searchbar, Surface, Text, TextInput } from 'react-native-paper';
import { cryptoAPI } from '../services/cryptoAPI';

const AddCryptoScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const searchCoins = useCallback(
    debounce(async (query) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await cryptoAPI.searchCrypto(query);
        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error('Error searching coins:', error);
        setError('Failed to search coins. Please try again.');
      } finally {
        setSearching(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    searchCoins(searchQuery);
  }, [searchQuery]);

  const handleCoinSelect = async (coin) => {
    setLoading(true);
    try {
      const coinDetails = await cryptoAPI.getCoinDetails(coin.id);
      setSelectedCoin({
        ...coin,
        ...coinDetails
      });
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error fetching coin details:', error);
      setError('Failed to fetch coin details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateInputs = () => {
    if (!selectedCoin) return 'Please select a cryptocurrency';
    if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      return 'Please enter a valid quantity';
    }
    if (!investmentAmount || isNaN(investmentAmount) || parseFloat(investmentAmount) <= 0) {
      return 'Please enter a valid investment amount';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        coinId: selectedCoin.id,
        symbol: selectedCoin.symbol,
        name: selectedCoin.name,
        quantity: parseFloat(quantity),
        investmentAmount: parseFloat(investmentAmount),
        purchasePrice: parseFloat(investmentAmount) / parseFloat(quantity),
        timestamp: new Date().toISOString(),
      };

      const existingData = await AsyncStorage.getItem('transactions_crypto');
      const transactions = existingData ? JSON.parse(existingData) : [];
      transactions.push(transaction);
      await AsyncStorage.setItem('transactions_crypto', JSON.stringify(transactions));

      navigation.goBack();
    } catch (error) {
      console.error('Error saving transaction:', error);
      setError('Failed to save transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {!selectedCoin ? (
            <>
              <Searchbar
                placeholder="Search cryptocurrency"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
              />
              {searching ? (
                <ActivityIndicator style={styles.loader} />
              ) : (
                <Surface style={styles.resultsList}>
                  {searchResults.map((coin) => (
                    <List.Item
                      key={coin.id}
                      title={coin.name}
                      description={coin.symbol}
                      left={props => (
                        <List.Image
                          {...props}
                          source={{ uri: coin.thumb }}
                          style={styles.coinImage}
                        />
                      )}
                      onPress={() => handleCoinSelect(coin)}
                      style={styles.listItem}
                    />
                  ))}
                </Surface>
              )}
            </>
          ) : (
            <Surface style={styles.form}>
              <View style={styles.selectedCoin}>
                <Text style={styles.label}>Selected Cryptocurrency</Text>
                <View style={styles.coinInfo}>
                  <Text style={styles.coinName}>{selectedCoin.name}</Text>
                  <Text style={styles.coinSymbol}>{selectedCoin.symbol}</Text>
                </View>
                <Text style={styles.currentPrice}>
                  Current Price: ₹{selectedCoin.currentPrice.toLocaleString()}
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setSelectedCoin(null)}
                  style={styles.changeButton}
                >
                  Change Cryptocurrency
                </Button>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <TextInput
                  label="Investment Amount (₹)"
                  value={investmentAmount}
                  onChangeText={setInvestmentAmount}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                {quantity && investmentAmount && (
                  <Text style={styles.pricePerUnit}>
                    Price per unit: ₹
                    {(parseFloat(investmentAmount) / parseFloat(quantity)).toLocaleString()}
                  </Text>
                )}
              </View>
            </Surface>
          )}

          {error && (
            <HelperText type="error" visible={true}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading || !selectedCoin || !quantity || !investmentAmount}
            style={styles.saveButton}
          >
            Save Investment
          </Button>
        </View>
      </ScrollView>
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
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  loader: {
    marginTop: 20,
  },
  resultsList: {
    borderRadius: 8,
    elevation: 2,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  coinImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  form: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  selectedCoin: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coinName: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  coinSymbol: {
    fontSize: 16,
    color: '#666',
  },
  currentPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  changeButton: {
    marginTop: 8,
  },
  inputContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  pricePerUnit: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  saveButton: {
    marginTop: 24,
  },
});

export default AddCryptoScreen; 