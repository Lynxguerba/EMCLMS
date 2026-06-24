import React, { useMemo } from 'react';
// @ts-ignore
import zxcvbn from 'zxcvbn';

interface PasswordStrengthBarProps {
  password?: string;
  barColors?: string[];
  scoreWords?: string[];
  className?: string;
  onChangeScore?: (score: number, feedback: any) => void;
  style?: React.CSSProperties;
}

const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({
  password = '',
  barColors = ['#ef4836', '#ff9800', '#ffeb3b', '#2b90ef', '#25c281'], // Red, Orange, Yellow, Blue, Green
  scoreWords = ['Too Short', 'Weak', 'Okay', 'Good', 'Strong', 'Excellent'],
  className,
  onChangeScore,
  style,
}) => {
  // Calculate custom score based on conditions
  const customScore = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (password.length >= 12) s++;
    return s;
  }, [password]);

  // Use zxcvbn for feedback
  const zxcvbnResult = useMemo(() => zxcvbn(password), [password]);

  // Notify parent of score change
  React.useEffect(() => {
    if (onChangeScore) {
      onChangeScore(customScore, zxcvbnResult.feedback);
    }
  }, [customScore, zxcvbnResult, onChangeScore]);

  // Styles for the bar segments
  const getBarColor = (index: number) => {
    // If bar index is less than score, it's filled
    if (index < customScore) {
      // Use the color corresponding to the current score (1-5)
      // Map score 1..5 to index 0..4
      const colorIndex = Math.max(0, Math.min(customScore - 1, 4));
      return barColors[colorIndex] || barColors[barColors.length - 1];
    }
    return '#ddd'; // Empty bar color
  };

  // Determine label
  // You might want to adjust how labels map to scores.
  // 0 -> Too Short?
  // 1 -> Weak
  // ...
  const label = scoreWords[customScore] || scoreWords[scoreWords.length - 1];

  return (
    <div className={className} style={style}>
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        marginBottom: '5px',
        height: '6px' 
      }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            style={{
              flex: 1,
              backgroundColor: getBarColor(index),
              borderRadius: '2px',
              transition: 'background-color 0.3s ease',
              height: '100%'
            }}
          />
        ))}
      </div>
      {label && (
        <div style={{ 
          textAlign: 'right', 
          fontSize: '12px', 
          color: customScore > 0 ? getBarColor(0) : '#999', // Use current score color for text, or grey
          fontWeight: 500
        }}>
          {label}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthBar;
