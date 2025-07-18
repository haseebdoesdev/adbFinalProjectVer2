import React from 'react';
import { Box, CircularProgress, Typography, keyframes } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  variant?: 'page' | 'inline';
}

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 40,
  variant = 'inline'
}) => {
  if (variant === 'page') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          animation: `${fadeIn} 0.5s ease-in-out`,
          gap: 3
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Outer ring */}
          <CircularProgress
            size={size + 20}
            thickness={2}
            sx={{
              color: 'primary.light',
              position: 'absolute',
              animation: `${pulse} 2s ease-in-out infinite`,
            }}
          />
          {/* Inner ring */}
          <CircularProgress
            size={size}
            thickness={4}
            sx={{
              color: 'primary.main',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }}
          />
        </Box>
        
        <Typography 
          variant="h6" 
          color="text.secondary"
          sx={{ 
            fontWeight: 500,
            animation: `${pulse} 2s ease-in-out infinite`,
            animationDelay: '0.5s'
          }}
        >
          {message}
        </Typography>
        
        {/* Loading dots */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                animation: `${pulse} 1.5s ease-in-out infinite`,
                animationDelay: `${index * 0.2}s`
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 2,
        animation: `${fadeIn} 0.3s ease-in-out`
      }}
    >
      <CircularProgress
        size={size}
        thickness={4}
        sx={{
          color: 'primary.main',
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          }
        }}
      />
      {message && (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner; 