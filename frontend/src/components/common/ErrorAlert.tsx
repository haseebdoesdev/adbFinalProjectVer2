import React from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { Close } from '@mui/icons-material';

interface ErrorAlertProps {
  error: string | null;
  onClose?: () => void;
  title?: string;
  variant?: 'standard' | 'filled' | 'outlined';
  severity?: 'error' | 'warning' | 'info' | 'success';
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onClose,
  title = 'Error',
  variant = 'standard',
  severity = 'error'
}) => {
  if (!error) return null;

  return (
    <Box mb={2}>
      <Alert 
        severity={severity} 
        variant={variant}
        action={
          onClose && (
            <Button
              color="inherit"
              size="small"
              onClick={onClose}
              startIcon={<Close />}
            >
              Close
            </Button>
          )
        }
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {error}
      </Alert>
    </Box>
  );
};

export default ErrorAlert; 