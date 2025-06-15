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
              <Text style={baseStyles.subtitle}>Amount: {formatCurrency(Math.round(transaction.amount), 0)}</Text>
            </View>
            <View style={baseStyles.headerRight}>
              <Text style={baseStyles.maturityLabel}>Matures on</Text>
              <Text style={baseStyles.maturityDate}>{formatDate(maturityDate)}</Text>
            </View>
          </View>
          
          {expanded && (
            <>
              <Divider style={baseStyles.divider} />
              <View style={baseStyles.detailsContainer}>
                <View style={baseStyles.detailRow}>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.detailLabel}>Investment Date</Text>
                    <Text style={baseStyles.detailValue}>{formatDate(transaction.investedOn)}</Text>
                  </View>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.detailLabel}>Duration</Text>
                    <Text style={baseStyles.detailValue}>{transaction.duration} months</Text>
                  </View>
                </View>
                <View style={baseStyles.detailRow}>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.detailLabel}>Interest Rate</Text>
                    <Text style={baseStyles.detailValue}>{transaction.roi}%</Text>
                  </View>
                  <View style={baseStyles.detailItem}>
                    <Text style={baseStyles.detailLabel}>Maturity Amount</Text>
                    <Text style={baseStyles.detailValue}>{formatCurrency(Math.round(transaction.maturityAmount), 0)}</Text>
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

const FixedDepositScreen = ({ route, navigation }) => {
  const { investmentId } = route.params;
  const theme = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [visible, setVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalInvestment: 0,
    totalMaturityAmount: 0,
    totalGain: 0,
    gainPercentage: 0
  });
  const [newTransaction, setNewTransaction] = useState({
    name: '',
    amount: '',
    investedOn: new Date().toISOString().split('T')[0],
    duration: '',
    roi: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await AsyncStorage.getItem(`transactions_${investmentId}`);
      if (data) {
        const parsedTransactions = JSON.parse(data);
        setTransactions(parsedTransactions);
        
        // Calculate portfolio summary
        const summary = parsedTransactions.reduce((acc, transaction) => {
          acc.totalInvestment += transaction.amount;
          acc.totalMaturityAmount += transaction.maturityAmount;
          return acc;
        }, {
          totalInvestment: 0,
          totalMaturityAmount: 0
        });

        summary.totalGain = summary.totalMaturityAmount - summary.totalInvestment;
        summary.gainPercentage = (summary.totalGain / summary.totalInvestment) * 100; // Keep decimal places for percentage

        setPortfolioSummary(summary);
      } else {
        setTransactions([]);
        setPortfolioSummary({
          totalInvestment: 0,
          totalMaturityAmount: 0,
          totalGain: 0,
          gainPercentage: 0
        });
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
      setPortfolioSummary({
        totalInvestment: 0,
        totalMaturityAmount: 0,
        totalGain: 0,
        gainPercentage: 0
      });
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

  const calculateMaturityAmount = (amount, duration, roi) => {
    const rate = roi / 100;
    const maturityAmount = amount * (1 + (rate * duration / 12));
    return Math.round(maturityAmount);
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

      const updatedTransactions = [...transactions, transaction];
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

      if (!portfolioData.investments[investmentId]) {
        portfolioData.investments[investmentId] = { total: 0, count: 0 };
      }

      portfolioData.investments[investmentId].total = (portfolioData.investments[investmentId].total || 0) + transaction.amount;
      portfolioData.investments[investmentId].count = (portfolioData.investments[investmentId].count || 0) + 1;
      portfolioData.totalInvestment = (portfolioData.totalInvestment || 0) + transaction.amount;

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
        'Failed to save the transaction. Please try again.',
        [{ text: 'OK' }]
      );
    }
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

  const styles = {
    ...baseStyles,
    ...dynamicStyles
  };

  const renderSummaryCard = () => (
    <Surface style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Portfolio Summary</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Investment</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(Math.round(portfolioSummary.totalInvestment), 0)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Maturity Amount</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(Math.round(portfolioSummary.totalMaturityAmount), 0)}
          </Text>
        </View>
      </View>
      <Divider style={styles.divider} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Gain</Text>
          <Text style={[
            styles.summaryValue,
            { color: portfolioSummary.totalGain >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {formatCurrency(Math.round(portfolioSummary.totalGain), 0)}
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {transactions && transactions.length > 0 ? (
          <>
            {renderSummaryCard()}
            {transactions.map((transaction) => (
              <TransactionCard 
                key={transaction.id} 
                transaction={transaction}
              />
            ))}
          </>
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
            <Dialog.Title style={styles.dialogTitle}>New Fixed Deposit</Dialog.Title>
            <Text style={styles.dialogSubtitle}>Enter deposit details</Text>
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
                    label="Deposit Amount"
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

        {Platform.OS === 'ios' && (
          <Dialog 
            visible={showDatePicker} 
            onDismiss={() => setShowDatePicker(false)}
            style={styles.datePickerDialog}
          >
            <Dialog.Title>Select Date</Dialog.Title>
            <Dialog.Content>
              <DateTimePicker
                value={new Date(newTransaction.investedOn)}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.iosDatePicker}
              />
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
          />
        )}
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setVisible(true)}
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
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
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

export default FixedDepositScreen; 