import React, { useEffect, useState, useMemo } from 'react';
import '../../styles/AnimatedStarsBackground.css';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleDelay: number;
}

const AnimatedStarsBackground: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [stars, setStars] = useState<Star[]>([]);

  // Generate stars
  const generateStars = useMemo(() => {
    const newStars: Star[] = [];
    const starCount = 50; // Adjust number of stars

    for (let i = 0; i < starCount; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100, // Percentage
        y: Math.random() * 100, // Percentage
        size: Math.random() * 3 + 1, // 1-4px
        opacity: Math.random() * 0.8 + 0.2, // 0.2-1
        twinkleSpeed: Math.random() * 3 + 2, // 2-5 seconds
        twinkleDelay: Math.random() * 2, // 0-2 seconds delay
      });
    }
    return newStars;
  }, []);

  useEffect(() => {
    setStars(generateStars);
  }, [generateStars]);
  return (
    <div className="animated-stars-container">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: isDarkMode ? star.opacity : star.opacity * 0.8, // Slightly reduce opacity in light mode
            animation: `twinkle ${star.twinkleSpeed}s ease-in-out infinite ${star.twinkleDelay}s`,
          }}
        />
      ))}
      <div className="shooting-star" />
    </div>
  );
};

export default AnimatedStarsBackground;
