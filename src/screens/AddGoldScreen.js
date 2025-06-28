import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';

const AddGoldScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    jewelryType: '',
    weight: '',
    purity: '',
    investmentAmount: '',
    purchaseDate: '',
    hallmark: '',
    store: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const requiredFields = ['jewelryType', 'weight', 'purity', 'investmentAmount', 'purchaseDate', 'store'];
    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        Alert.alert('Validation Error', `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    const weight = parseFloat(formData.weight);
    const purity = parseFloat(formData.purity);
    const amount = parseFloat(formData.investmentAmount);

    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid weight');
      return false;
    }

    if (isNaN(purity) || purity <= 0 || purity > 100) {
      Alert.alert('Validation Error', 'Please enter a valid purity percentage (1-100)');
      return false;
    }

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid investment amount');
      return false;
    }

    return true;
  };

  const saveTransaction = async () => {
    if (!validateForm()) return;

    try {
      const existingData = await AsyncStorage.getItem('transactions_gold');
      const transactions = existingData ? JSON.parse(existingData) : [];

      const newTransaction = {
        ...formData,
        weight: parseFloat(formData.weight),
        purity: parseFloat(formData.purity),
        investmentAmount: parseFloat(formData.investmentAmount),
        id: Date.now().toString(),
      };

      transactions.push(newTransaction);
      await AsyncStorage.setItem('transactions_gold', JSON.stringify(transactions));

      Alert.alert(
        'Success',
        'Gold deposit transaction added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Add Gold Deposit</Text>
          
          <TextInput
            label="Jewelry Type"
            value={formData.jewelryType}
            onChangeText={(text) => handleInputChange('jewelryType', text)}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., Gold Chain, Ring, Bracelet"
          />

          <TextInput
            label="Weight (grams)"
            value={formData.weight}
            onChangeText={(text) => handleInputChange('weight', text)}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g., 10.5"
          />

          <TextInput
            label="Purity (%)"
            value={formData.purity}
            onChangeText={(text) => handleInputChange('purity', text)}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g., 91.6"
          />

          <TextInput
            label="Investment Amount (₹)"
            value={formData.investmentAmount}
            onChangeText={(text) => handleInputChange('investmentAmount', text)}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g., 50000"
          />

          <TextInput
            label="Purchase Date"
            value={formData.purchaseDate}
            onChangeText={(text) => handleInputChange('purchaseDate', text)}
            style={styles.input}
            mode="outlined"
            placeholder="DD/MM/YYYY"
          />

          <TextInput
            label="Hallmark"
            value={formData.hallmark}
            onChangeText={(text) => handleInputChange('hallmark', text)}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., BIS 916"
          />

          <TextInput
            label="Store/Jeweler"
            value={formData.store}
            onChangeText={(text) => handleInputChange('store', text)}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., Tanishq, Local Jeweler"
          />

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={saveTransaction}
              style={styles.saveButton}
              buttonColor="#FFD700"
            >
              Save Transaction
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    elevation: 2,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  saveButton: {
    paddingVertical: 8,
  },
});

export default AddGoldScreen; 