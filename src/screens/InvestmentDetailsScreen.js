import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Dialog, Divider, FAB, HelperText, Portal, Surface, TextInput, useTheme } from 'react-native-paper';
import { formatCurrency } from '../constants/investments';

// Move formatDate function here so it's accessible to all components
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Add function to calculate maturity date
const calculateMaturityDate = (startDate, durationInMonths) => {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + durationInMonths);
  return date.toISOString().split('T')[0];
};

const TransactionCard = ({ transaction }) => {
  const [expanded, setExpanded] = useState(false);
  const maturityDate = calculateMaturityDate(transaction.investedOn, transaction.duration);

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
              <Text style={baseStyles.subtitle}>Monthly: {formatCurrency(transaction.amount)}</Text>
            </View>
            <View style={baseStyles.headerRight}>
              <Text style={baseStyles.maturityLabel}>Matures on</Text>
              <Text style={baseStyles.maturityDate}>{formatDate(maturityDate)}</Text>
            </View>
          </View>

          {expanded && (
            <View style={baseStyles.expandedContent}>
              <Divider style={baseStyles.divider} />
              <Surface style={baseStyles.detailsContainer}>
                <View style={baseStyles.detailRow}>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Duration</Text>
                    <Text style={baseStyles.value}>{transaction.duration} months</Text>
                  </View>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>ROI</Text>
                    <Text style={baseStyles.value}>{transaction.roi}%</Text>
                  </View>
                </View>

                <View style={baseStyles.detailRow}>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Start Date</Text>
                    <Text style={baseStyles.value}>{formatDate(transaction.investedOn)}</Text>
                  </View>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Maturity Date</Text>
                    <Text style={baseStyles.value}>{formatDate(maturityDate)}</Text>
                  </View>
                </View>

                <View style={baseStyles.detailRow}>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.label}>Maturity Amount</Text>
                    <Text style={baseStyles.value}>{formatCurrency(transaction.maturityAmount)}</Text>
                  </View>
                </View>

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

const InvestmentDetailsScreen = ({ route, navigation }) => {
  const { type, investmentId } = route.params;
  const [transactions, setTransactions] = useState([]);
  const [visible, setVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    name: '',
    amount: '',
    investedOn: new Date().toISOString().split('T')[0],
    duration: '',
    roi: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const theme = useTheme();

  console.log('Screen rendered with params:', { type, investmentId });
  console.log('Current transactions state:', transactions);

  useEffect(() => {
    console.log('Loading transactions...');
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      console.log('Fetching transactions for:', investmentId);
      const data = await AsyncStorage.getItem(`transactions_${investmentId}`);
      console.log('Raw data from storage:', data);
      
      if (data) {
        const parsedTransactions = JSON.parse(data);
        console.log('Parsed transactions:', parsedTransactions);
        setTransactions(parsedTransactions);
      } else {
        console.log('No transactions found in storage');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!newTransaction.name) newErrors.name = 'Name is required';
    if (!newTransaction.amount) newErrors.amount = 'Amount is required';
    if (!newTransaction.duration) newErrors.duration = 'Duration is required';
    if (!newTransaction.roi) newErrors.roi = 'Rate of Interest is required';
    
    // Validate numeric fields
    if (isNaN(newTransaction.amount) || parseFloat(newTransaction.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (isNaN(newTransaction.duration) || parseInt(newTransaction.duration) <= 0) {
      newErrors.duration = 'Please enter a valid duration in months';
    }
    if (isNaN(newTransaction.roi) || parseFloat(newTransaction.roi) <= 0 || parseFloat(newTransaction.roi) >= 100) {
      newErrors.roi = 'Please enter a valid interest rate (0-100)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveTransaction = async () => {
    if (!validateForm()) return;

    try {
      const transaction = {
        id: Date.now().toString(),
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        duration: parseInt(newTransaction.duration),
        roi: parseFloat(newTransaction.roi),
        maturityAmount: calculateMaturityAmount(
          parseFloat(newTransaction.amount),
          parseInt(newTransaction.duration),
          parseFloat(newTransaction.roi)
        )
      };

      console.log('Saving new transaction:', transaction);

      // Validate transaction data
      if (isNaN(transaction.amount) || isNaN(transaction.duration) || isNaN(transaction.roi)) {
        throw new Error('Invalid transaction data');
      }

      const updatedTransactions = [...transactions, transaction];
      console.log('Updated transactions array:', updatedTransactions);
      
      await AsyncStorage.setItem(
        `transactions_${investmentId}`,
        JSON.stringify(updatedTransactions)
      );
      
      // Initialize or update portfolio data
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

      // Ensure the investment type exists in the portfolio
      if (!portfolioData.investments[investmentId]) {
        portfolioData.investments[investmentId] = { total: 0, count: 0 };
      }

      // Calculate total investment amount (monthly amount × duration)
      const totalInvestmentAmount = transaction.amount * transaction.duration;

      if (isNaN(totalInvestmentAmount)) {
        throw new Error('Invalid total investment amount calculation');
      }

      // Update the investment totals with the total investment amount
      portfolioData.investments[investmentId].total = (portfolioData.investments[investmentId].total || 0) + totalInvestmentAmount;
      portfolioData.investments[investmentId].count = (portfolioData.investments[investmentId].count || 0) + 1;
      portfolioData.totalInvestment = (portfolioData.totalInvestment || 0) + totalInvestmentAmount;

      // Validate updated portfolio data before saving
      if (isNaN(portfolioData.totalInvestment) || 
          isNaN(portfolioData.investments[investmentId].total) || 
          isNaN(portfolioData.investments[investmentId].count)) {
        throw new Error('Invalid portfolio data after update');
      }

      await AsyncStorage.setItem('portfolioData', JSON.stringify(portfolioData));

      setTransactions(updatedTransactions);
      setVisible(false);
      setShowDatePicker(false);
      setNewTransaction({
        name: '',
        amount: '',
        investedOn: new Date().toISOString().split('T')[0],
        duration: '',
        roi: '',
        description: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert(
        'Error',
        'Failed to save the transaction. Please try again. ' + error.message,
        [{ text: 'OK' }]
      );
    }
  };

  const calculateMaturityAmount = (amount, duration, roi) => {
    const monthlyRate = roi / (12 * 100);
    const maturityAmount = amount * duration * (1 + (duration + 1) * monthlyRate / 2);
    return Math.round(maturityAmount * 100) / 100;
  };

  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setNewTransaction({
        ...newTransaction,
        investedOn: selectedDate.toISOString().split('T')[0]
      });
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const openDatePicker = () => {
    console.log('Opening date picker');
    setShowDatePicker(true);
  };

  // Add helper function to get labels based on type
  const getFieldLabels = () => {
    if (type === 'fd') {
      return {
        title: 'New Fixed Deposit',
        subtitle: 'Enter deposit details',
        amountLabel: 'Deposit Amount',
      };
    }
    return {
      title: 'New Recurring Deposit',
      subtitle: 'Enter deposit details',
      amountLabel: 'Monthly Amount',
    };
  };

  const labels = getFieldLabels();

  // Create dynamic styles that depend on theme
  const dynamicStyles = StyleSheet.create({
    dialogHeader: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
      backgroundColor: theme.colors.primary,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      margin: 0,
      marginTop: -1,
    },
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

  // Combine base styles with dynamic styles
  const styles = {
    ...baseStyles,
    ...dynamicStyles
  };

  return (
    <Portal.Host>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          {transactions && transactions.length > 0 ? (
            transactions.map((transaction) => {
              console.log('Rendering transaction:', transaction);
              return (
                <TransactionCard 
                  key={transaction.id} 
                  transaction={transaction}
                />
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          )}
        </ScrollView>

        <Portal>
          <Dialog 
            visible={visible} 
            onDismiss={() => setVisible(false)} 
            style={[styles.dialog, { margin: 0, padding: 0 }]}
          >
            <View style={styles.dialogHeader}>
              <Dialog.Title style={styles.dialogTitle}>{labels.title}</Dialog.Title>
              <Text style={styles.dialogSubtitle}>{labels.subtitle}</Text>
            </View>
            <Dialog.ScrollArea style={styles.dialogScrollArea}>
              <ScrollView 
                contentContainerStyle={styles.dialogScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.dialogContent}>
                  <Surface style={styles.inputContainer}>
                    <TextInput
                      label="Name of Deposit"
                      value={newTransaction.name}
                      onChangeText={(text) => setNewTransaction({ ...newTransaction, name: text })}
                      style={styles.input}
                      error={!!errors.name}
                      mode="outlined"
                      outlineColor="#E0E0E0"
                      activeOutlineColor={theme.colors.primary}
                      left={<TextInput.Icon icon="bank" color={theme.colors.primary} />}
                      theme={{
                        ...inputTheme,
                        colors: { ...inputTheme.colors, primary: theme.colors.primary }
                      }}
                    />
                    {errors.name && (
                      <HelperText type="error" visible={true} style={styles.errorText}>
                        {errors.name}
                      </HelperText>
                    )}
                  </Surface>

                  <Surface style={styles.inputContainer}>
                    <TextInput
                      label={labels.amountLabel}
                      value={newTransaction.amount}
                      onChangeText={(text) => setNewTransaction({ ...newTransaction, amount: text })}
                      keyboardType="numeric"
                      style={styles.input}
                      error={!!errors.amount}
                      mode="outlined"
                      outlineColor="#E0E0E0"
                      activeOutlineColor={theme.colors.primary}
                      left={<TextInput.Icon icon="currency-inr" color={theme.colors.primary} />}
                      theme={{
                        ...inputTheme,
                        colors: { ...inputTheme.colors, primary: theme.colors.primary }
                      }}
                    />
                    {errors.amount && (
                      <HelperText type="error" visible={true} style={styles.errorText}>
                        {errors.amount}
                      </HelperText>
                    )}
                  </Surface>

                  <Surface style={styles.inputContainer}>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(true)}
                      style={styles.datePickerButton}
                    >
                      <TextInput
                        label="Investment Date"
                        value={formatDate(newTransaction.investedOn)}
                        style={styles.input}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={theme.colors.primary}
                        editable={false}
                        left={<TextInput.Icon icon="calendar" color={theme.colors.primary} onPress={() => setShowDatePicker(true)} />}
                        theme={{
                          ...inputTheme,
                          colors: { ...inputTheme.colors, primary: theme.colors.primary }
                        }}
                      />
                    </TouchableOpacity>
                  </Surface>

                  <View style={styles.row}>
                    <Surface style={[styles.inputContainer, styles.halfWidth]}>
                      <TextInput
                        label="Duration (Months)"
                        value={newTransaction.duration}
                        onChangeText={(text) => setNewTransaction({ ...newTransaction, duration: text })}
                        keyboardType="numeric"
                        style={styles.input}
                        error={!!errors.duration}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={theme.colors.primary}
                        left={<TextInput.Icon icon="clock-outline" color={theme.colors.primary} />}
                        theme={{
                          ...inputTheme,
                          colors: { ...inputTheme.colors, primary: theme.colors.primary }
                        }}
                      />
                      {errors.duration && (
                        <HelperText type="error" visible={true} style={styles.errorText}>
                          {errors.duration}
                        </HelperText>
                      )}
                    </Surface>

                    <Surface style={[styles.inputContainer, styles.halfWidth]}>
                      <TextInput
                        label="Interest Rate (%)"
                        value={newTransaction.roi}
                        onChangeText={(text) => setNewTransaction({ ...newTransaction, roi: text })}
                        keyboardType="numeric"
                        style={styles.input}
                        error={!!errors.roi}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={theme.colors.primary}
                        left={<TextInput.Icon icon="percent" color={theme.colors.primary} />}
                        theme={{
                          ...inputTheme,
                          colors: { ...inputTheme.colors, primary: theme.colors.primary }
                        }}
                      />
                      {errors.roi && (
                        <HelperText type="error" visible={true} style={styles.errorText}>
                          {errors.roi}
                        </HelperText>
                      )}
                    </Surface>
                  </View>

                  <Surface style={styles.inputContainer}>
                    <TextInput
                      label="Notes (Optional)"
                      value={newTransaction.description}
                      onChangeText={(text) => setNewTransaction({ ...newTransaction, description: text })}
                      style={[styles.input, styles.multilineInput]}
                      mode="outlined"
                      outlineColor="#E0E0E0"
                      activeOutlineColor={theme.colors.primary}
                      multiline
                      numberOfLines={3}
                      left={<TextInput.Icon icon="note-text" color={theme.colors.primary} />}
                      theme={{
                        ...inputTheme,
                        colors: { ...inputTheme.colors, primary: theme.colors.primary }
                      }}
                    />
                  </Surface>
                </View>
              </ScrollView>
            </Dialog.ScrollArea>
            <View style={styles.dialogActionsContainer}>
              <Dialog.Actions style={styles.dialogActions}>
                <Button 
                  mode="text" 
                  onPress={() => {
                    setVisible(false);
                    setErrors({});
                    setShowDatePicker(false);
                    setNewTransaction({
                      name: '',
                      amount: '',
                      investedOn: new Date().toISOString().split('T')[0],
                      duration: '',
                      roi: '',
                      description: ''
                    });
                  }}
                  style={styles.dialogButton}
                  labelStyle={styles.buttonLabel}
                  textColor={theme.colors.primary}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={saveTransaction}
                  style={styles.dialogButton}
                  labelStyle={styles.buttonLabel}
                >
                  Save
                </Button>
              </Dialog.Actions>
            </View>
          </Dialog>

          {/* Separate Date Picker Dialog */}
          {Platform.OS === 'ios' && (
            <Dialog 
              visible={showDatePicker} 
              onDismiss={() => setShowDatePicker(false)}
              style={styles.datePickerDialog}
            >
              <Dialog.Title style={styles.datePickerTitle}>Select Date</Dialog.Title>
              <Dialog.Content style={styles.datePickerContent}>
                <View style={styles.datePickerWrapper}>
                  <DateTimePicker
                    value={new Date(newTransaction.investedOn)}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    style={styles.iosDatePicker}
                    textColor="#000000"
                  />
                </View>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setShowDatePicker(false)}>Done</Button>
              </Dialog.Actions>
            </Dialog>
          )}

          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={new Date(newTransaction.investedOn)}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </Portal>

        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => setVisible(true)}
        />
      </View>
    </Portal.Host>
  );
};

// Move these outside the component
const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  dialog: {
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 5,
    width: '90%',
    alignSelf: 'center',
    maxHeight: '95%',
    paddingVertical: 0,
    overflow: 'hidden',
  },
  dialogTitle: {
    textAlign: 'left',
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
    padding: 0,
    lineHeight: 24,
  },
  dialogSubtitle: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 2,
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
    maxHeight: '87%',
  },
  dialogScrollContent: {
    flexGrow: 1,
    width: '100%',
  },
  dialogContent: {
    padding: 16,
    paddingTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    elevation: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  input: {
    backgroundColor: '#fff',
    fontSize: 14,
    width: '100%',
    minHeight: 44,
  },
  multilineInput: {
    minHeight: 60,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'stretch',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dialogActionsContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dialogActions: {
    padding: 0,
    justifyContent: 'flex-end',
    width: '100%',
  },
  dialogButton: {
    minWidth: 70,
    marginLeft: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#B00020',
    paddingHorizontal: 0,
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
  datePickerDialog: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  datePickerTitle: {
    textAlign: 'center',
    paddingVertical: 16,
  },
  datePickerContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  datePickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iosDatePicker: {
    width: '100%',
    height: 200,
    alignSelf: 'center',
  },
  datePickerButton: {
    width: '100%',
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
    alignItems: 'center',
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  maturityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  maturityDate: {
    fontSize: 14,
    color: '#666',
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
  },
  detailItem: {
    flex: 1,
    marginRight: 16,
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
});

const inputTheme = {
  colors: {
    background: '#fff',
    placeholder: '#9E9E9E',
    text: '#212121',
    error: '#B00020',
  },
  roundness: 8,
};

export default InvestmentDetailsScreen; 