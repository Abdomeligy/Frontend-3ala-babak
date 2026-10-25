import React from 'react';

import {
  View,
  TextInput,
  Text,
  StyleSheet,
} from 'react-native';

export default function InputField({
  label,
  error,
  ...props
}) {
  return (
    <View style={styles.container}>

      {label ? (
        <Text style={styles.label}>
          {label}
        </Text>
      ) : null}

      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
        ]}
        placeholderTextColor="#8A8A8A"
        selectionColor="#1769E8"
        {...props}
      />

      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    marginBottom: 13,
    width: '100%',
  },

  label: {
    fontSize: 12,

    color: '#FFFFFF',

    marginBottom: 6,

    fontWeight: '600',

    textAlign: 'right',
  },

  input: {
    height: 52,

    width: '100%',

    backgroundColor: '#FFFFFF',

    borderRadius: 27,

    paddingHorizontal: 20,

    paddingVertical: 0,

    fontSize: 15,

    color: '#333333',

    textAlign: 'right',

    elevation: 3,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,

      height: 2,
    },

    shadowOpacity: 0.10,

    shadowRadius: 4,
  },

  inputError: {
    borderWidth: 2,

    borderColor: '#EF4444',
  },

  errorText: {
    color: '#FFFFFF',

    fontSize: 11,

    marginTop: 4,

    textAlign: 'right',
  },

});